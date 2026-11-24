import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_CUSTOMER_MARKETING_PERMISSION } from '@app/modules/customer/enums/customer-marketing.enum';
import { CustomerMarketingStateEntity } from '@app/modules/customer/repository/entities/customer-marketing-state.entity';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '@app/modules/conversation/enums/conversation.enum';
import { ENUM_MESSAGE_DIRECTION } from '@app/modules/conversation/enums/message.enum';
import { ENUM_MARKETING_EVENT_KIND as K } from '@app/modules/customer/enums/customer-marketing.enum';
import { ENUM_ORDER_STATUS } from '@app/modules/order/enums/order.enum';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    MARKETING_ORDER_WINDOW_DAYS,
    MARKETING_REPLY_WINDOW_HOURS,
    MARKETING_SEND_EMPTY_STATS,
} from '../../constants/marketing-send.constant';
import {
    ENUM_MARKETING_REPLY_STATUS as R,
    ENUM_MARKETING_MESSAGE_STATUS as S,
    ENUM_MARKETING_SKIP_REASON,
} from '../../enums/marketing-send.enum';
import {
    IMarketingProduct,
    IMarketingSendChannelStats,
    IMarketingSendReply,
    IMarketingSendStats,
} from '../../interfaces/marketing-send.interface';
import { MarketingMessageEntity } from '../entities/marketing-message.entity';

/** The customer opted out after this offer (`m` is its marketing_messages row). */
const STOPPED_AFTER_OFFER = `EXISTS (
    SELECT 1 FROM marketing_events e
    WHERE e.customer_id = m.customer_id
        AND e.kind = '${K.PERMISSION}'
        AND e.new_value = '${ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED}'
        AND e.deleted_at IS NULL
        AND e.created_at >= m.sent_at
)`;

/**
 * The sends' messages (m), the orders their sent offers brought within the
 * order window (o, one row per order and send), and who opted out after a
 * sent offer (stopped). Binds the send ids, then the window in days.
 */
const RESULTS_SQL = `
    WITH m AS (
        SELECT * FROM marketing_messages WHERE send_id IN (?)
    ), o AS (
        SELECT DISTINCT ON (o.id, m.send_id) m.send_id, m.channel, o.customer_id, o.total
        FROM m
        JOIN orders o ON o.customer_id = m.customer_id
            AND o.ordered_at >= m.sent_at
            AND o.ordered_at < m.sent_at + make_interval(days => ?)
            AND o.status <> '${ENUM_ORDER_STATUS.CANCELLED}'
            AND o.deleted_at IS NULL
        WHERE m.status = '${S.SENT}'
    ), stopped AS (
        SELECT DISTINCT m.send_id, m.channel, m.customer_id
        FROM m
        WHERE m.status = '${S.SENT}' AND ${STOPPED_AFTER_OFFER}
    )`;

/** One planned row: QUEUED with its conversation, or SKIPPED with a reason. */
export interface IMarketingMessagePlan {
    customerId: string;
    channel: string | null;
    conversationId: string | null;
    status: S.QUEUED | S.SKIPPED;
    skipReason: ENUM_MARKETING_SKIP_REASON | null;
    sendDay: string;
}

@Injectable()
export class MarketingMessageRepository extends DatabaseRepository<MarketingMessageEntity> {
    constructor(em: EntityManager) {
        super(em, MarketingMessageEntity);
    }

    /**
     * Writes a send's rows in one statement. A QUEUED row for a customer who
     * already has an offer that day is dropped by the unique index, so two
     * sends started together still give one offer a day. Returns the QUEUED
     * rows that went in.
     */
    async plan(
        workspaceId: string,
        sendId: string,
        rows: IMarketingMessagePlan[]
    ): Promise<{ id: string; customerId: string; sendDay: string }[]> {
        if (!rows.length) return [];
        const inserted: {
            id: string;
            customer_id: string;
            send_day: string;
            status: S;
        }[] = await this.em.getConnection().execute(
            `
            INSERT INTO marketing_messages
                (workspace_id, send_id, customer_id, channel, conversation_id, status, skip_reason, send_day)
            SELECT ?::uuid, ?::uuid, r.customer_id, r.channel, r.conversation_id, r.status, r.skip_reason, r.send_day
            FROM jsonb_to_recordset(?::jsonb) AS r(
                customer_id uuid, channel text, conversation_id uuid,
                status text, skip_reason text, send_day date
            )
            ON CONFLICT (customer_id, send_day) WHERE status IN ('${S.QUEUED}', '${S.SENT}')
            DO NOTHING
            RETURNING id, customer_id, to_char(send_day, 'YYYY-MM-DD') AS send_day, status
            `,
            [
                workspaceId,
                sendId,
                JSON.stringify(
                    rows.map(r => ({
                        customer_id: r.customerId,
                        channel: r.channel,
                        conversation_id: r.conversationId,
                        status: r.status,
                        skip_reason: r.skipReason,
                        send_day: r.sendDay,
                    }))
                ),
            ]
        );
        return inserted.flatMap(row =>
            row.status === S.QUEUED
                ? [
                      {
                          id: row.id,
                          customerId: row.customer_id,
                          sendDay: row.send_day,
                      },
                  ]
                : []
        );
    }

    /** A row still waiting to go out, with what sending it needs. */
    findQueued(id: string): Promise<MarketingMessageEntity | null> {
        return this.em.findOne(
            MarketingMessageEntity,
            { id, status: S.QUEUED },
            {
                populate: [
                    'send',
                    'customer',
                    'conversation.account',
                    'conversation.chatbot',
                ],
            }
        );
    }

    async isStopped(customerId: string): Promise<boolean> {
        const state = await this.em.findOne(CustomerMarketingStateEntity, {
            customer: customerId,
        });
        return state?.permission === ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED;
    }

    /**
     * Marks a QUEUED row as being sent (sent_at set while still QUEUED), so
     * one run of its task goes on. False when another run claimed it.
     */
    async claim(id: string): Promise<boolean> {
        const changed = await this.em.nativeUpdate(
            MarketingMessageEntity,
            { id, status: S.QUEUED, sentAt: null },
            { sentAt: new Date() }
        );
        return changed > 0;
    }

    /**
     * The platform blocked a page: the send's offers still waiting on that
     * page are skipped, so their tasks send nothing. Rows another run has
     * already claimed are left to finish.
     */
    async skipQueuedOnAccount(
        sendId: string,
        accountId: string
    ): Promise<void> {
        await this.em.getConnection().execute(
            `
            UPDATE marketing_messages mm
            SET status = ?, skip_reason = ?, updated_at = now()
            FROM conversations c
            WHERE c.id = mm.conversation_id
                AND mm.send_id = ?::uuid
                AND c.account_id = ?::uuid
                AND mm.status = ?
                AND mm.sent_at IS NULL
            `,
            [
                S.SKIPPED,
                ENUM_MARKETING_SKIP_REASON.ACCOUNT_BLOCKED,
                sendId,
                accountId,
                S.QUEUED,
            ]
        );
    }

    /** Ends a QUEUED row; false when another run already ended it. */
    async finish(
        id: string,
        update: Pick<MarketingMessageEntity, 'status' | 'skipReason' | 'sentAt'>
    ): Promise<boolean> {
        const changed = await this.em.nativeUpdate(
            MarketingMessageEntity,
            { id, status: S.QUEUED },
            update
        );
        return changed > 0;
    }

    /** The customer wrote: answers every offer of the last 72 hours. */
    async markReplied(customerId: string, at: Date): Promise<void> {
        await this.em.nativeUpdate(
            MarketingMessageEntity,
            {
                customer: customerId,
                status: S.SENT,
                repliedAt: null,
                sentAt: {
                    $gte: new Date(
                        at.getTime() - MARKETING_REPLY_WINDOW_HOURS * 3_600_000
                    ),
                    $lte: at,
                },
            },
            { repliedAt: at }
        );
    }

    /** How each send went, counted from its messages. */
    async statsBySend(
        sendIds: string[]
    ): Promise<Map<string, IMarketingSendStats>> {
        if (!sendIds.length) return new Map();
        const rows: (Record<keyof IMarketingSendStats, string | null> & {
            send_id: string;
            last_sent_at: Date | null;
            opted_out: string;
        })[] = await this.em.getConnection().execute(
            `${RESULTS_SQL}
            SELECT m.send_id,
                count(*) FILTER (WHERE m.status = '${S.QUEUED}') AS queued,
                count(*) FILTER (WHERE m.status = '${S.SENT}') AS sent,
                count(*) FILTER (WHERE m.status = '${S.FAILED}') AS failed,
                count(*) FILTER (WHERE m.status = '${S.SKIPPED}') AS skipped,
                count(*) FILTER (WHERE m.replied_at IS NOT NULL) AS replied,
                max(m.sent_at) FILTER (WHERE m.status = '${S.SENT}') AS last_sent_at,
                (SELECT count(DISTINCT o.customer_id) FROM o WHERE o.send_id = m.send_id) AS ordered,
                (SELECT coalesce(sum(o.total), 0) FROM o WHERE o.send_id = m.send_id) AS revenue,
                (SELECT count(*) FROM stopped st WHERE st.send_id = m.send_id) AS opted_out
            FROM m
            GROUP BY m.send_id
            `,
            [sendIds, MARKETING_ORDER_WINDOW_DAYS]
        );
        return new Map(
            rows.map(row => [
                row.send_id,
                {
                    queued: Number(row.queued),
                    sent: Number(row.sent),
                    failed: Number(row.failed),
                    skipped: Number(row.skipped),
                    replied: Number(row.replied),
                    ordered: Number(row.ordered),
                    revenue: Number(row.revenue),
                    optedOut: Number(row.opted_out),
                    lastSentAt: row.last_sent_at
                        ? new Date(row.last_sent_at)
                        : null,
                },
            ])
        );
    }

    async stats(sendId: string): Promise<IMarketingSendStats> {
        return (
            (await this.statsBySend([sendId])).get(sendId) ??
            MARKETING_SEND_EMPTY_STATS
        );
    }

    /** One send's sent offers and what came of them, by channel. */
    async statsByChannel(
        sendId: string
    ): Promise<IMarketingSendChannelStats[]> {
        const rows: {
            channel: ENUM_ACCOUNT_TYPE;
            sent: string;
            replied: string;
            ordered: string;
            opted_out: string;
        }[] = await this.em.getConnection().execute(
            `${RESULTS_SQL}
            SELECT m.channel,
                count(*) AS sent,
                count(*) FILTER (WHERE m.replied_at IS NOT NULL) AS replied,
                (SELECT count(DISTINCT o.customer_id) FROM o WHERE o.channel = m.channel) AS ordered,
                (SELECT count(*) FROM stopped st WHERE st.channel = m.channel) AS opted_out
            FROM m
            WHERE m.status = '${S.SENT}'
            GROUP BY m.channel
            ORDER BY count(*) DESC
            `,
            [[sendId], MARKETING_ORDER_WINDOW_DAYS]
        );
        return rows.map(row => ({
            channel: row.channel,
            sent: Number(row.sent),
            replied: Number(row.replied),
            ordered: Number(row.ordered),
            optedOut: Number(row.opted_out),
        }));
    }

    /** Customers the send skipped, by reason; each customer counted once a reason. */
    async skipReasons(
        sendId: string
    ): Promise<{ reason: ENUM_MARKETING_SKIP_REASON; count: number }[]> {
        const rows: { reason: ENUM_MARKETING_SKIP_REASON; count: string }[] =
            await this.em.getConnection().execute(
                `
            SELECT skip_reason AS reason, count(DISTINCT customer_id) AS count
            FROM marketing_messages
            WHERE send_id = ?::uuid AND status = '${S.SKIPPED}'
            GROUP BY skip_reason
            ORDER BY count(DISTINCT customer_id) DESC
            `,
                [sendId]
            );
        return rows.map(row => ({
            reason: row.reason,
            count: Number(row.count),
        }));
    }

    /** One page of customers who answered the send, latest reply first. */
    async replies(
        sendId: string,
        limit: number,
        offset: number
    ): Promise<IMarketingSendReply[]> {
        const rows: {
            customer_id: string;
            name: string | null;
            conversation_id: string | null;
            text: string | null;
            replied_at: Date;
            ordered: boolean;
            stopped: boolean;
            waiting: boolean;
        }[] = await this.em.getConnection().execute(
            `
            SELECT m.customer_id, c.name, m.conversation_id, m.replied_at,
                (
                    SELECT msg.text FROM messages msg
                    WHERE msg.conversation_id = m.conversation_id
                        AND msg.direction = '${ENUM_MESSAGE_DIRECTION.INBOUND}'
                        AND msg.date_sent >= m.sent_at
                    ORDER BY msg.date_sent ASC
                    LIMIT 1
                ) AS text,
                EXISTS (
                    SELECT 1 FROM orders o
                    WHERE o.customer_id = m.customer_id
                        AND o.ordered_at >= m.sent_at
                        AND o.ordered_at < m.sent_at + make_interval(days => ?)
                        AND o.status <> '${ENUM_ORDER_STATUS.CANCELLED}'
                        AND o.deleted_at IS NULL
                ) AS ordered,
                ${STOPPED_AFTER_OFFER} AS stopped,
                COALESCE(cv.bot_enabled = false AND cv.status = '${ENUM_CONVERSATION_STATUS.OPEN}', false) AS waiting
            FROM marketing_messages m
            JOIN customers c ON c.id = m.customer_id
            LEFT JOIN conversations cv ON cv.id = m.conversation_id
            WHERE m.send_id = ?::uuid AND m.replied_at IS NOT NULL
            ORDER BY m.replied_at DESC, m.id
            LIMIT ? OFFSET ?
            `,
            [MARKETING_ORDER_WINDOW_DAYS, sendId, limit, offset]
        );
        return rows.map(row => ({
            customerId: row.customer_id,
            name: row.name,
            conversationId: row.conversation_id,
            text: row.text,
            repliedAt: new Date(row.replied_at),
            status: row.ordered
                ? R.ORDERED
                : row.stopped
                  ? R.STOPPED
                  : row.waiting
                    ? R.WAITING
                    : R.BOT,
        }));
    }

    /**
     * The product an offer names for this customer: the product group they
     * last asked about, or the one in their last order; `bought` puts the
     * order first.
     */
    async productFor(
        customerId: string,
        bought: boolean
    ): Promise<IMarketingProduct | null> {
        const asked = `
            SELECT g.name, coalesce(g.image_cdn_url, g.image_completed_url) AS image_url, e.created_at AS at
            FROM marketing_events e
            JOIN product_groups g ON g.id = e.product_group_id AND g.deleted_at IS NULL
            WHERE e.customer_id = ?::uuid
                AND e.kind = '${K.INTENT}'
                AND e.deleted_at IS NULL
            ORDER BY e.created_at DESC
            LIMIT 1`;
        const ordered = `
            SELECT g.name, coalesce(g.image_cdn_url, g.image_completed_url) AS image_url, o.ordered_at AS at
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
            JOIN product_groups g ON g.id = oi.product_group_id AND g.deleted_at IS NULL
            WHERE o.customer_id = ?::uuid
                AND o.status <> '${ENUM_ORDER_STATUS.CANCELLED}'
                AND o.deleted_at IS NULL
            ORDER BY o.ordered_at DESC
            LIMIT 1`;
        const [first, second] = bought ? [ordered, asked] : [asked, ordered];
        const [row]: { name: string; image_url: string | null }[] =
            await this.em.getConnection().execute(
                `
            SELECT name, image_url FROM (
                (SELECT 1 AS rank, * FROM (${first}) a)
                UNION ALL
                (SELECT 2 AS rank, * FROM (${second}) b)
            ) p
            ORDER BY rank
            LIMIT 1
            `,
                [customerId, customerId]
            );
        return row ? { name: row.name, imageUrl: row.image_url } : null;
    }
}
