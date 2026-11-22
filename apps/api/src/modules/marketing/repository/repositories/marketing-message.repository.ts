import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_CUSTOMER_MARKETING_PERMISSION } from '@app/modules/customer/enums/customer-marketing.enum';
import { CustomerMarketingStateEntity } from '@app/modules/customer/repository/entities/customer-marketing-state.entity';
import { ENUM_ORDER_STATUS } from '@app/modules/order/enums/order.enum';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    MARKETING_ORDER_WINDOW_DAYS,
    MARKETING_REPLY_WINDOW_HOURS,
} from '../../constants/marketing-send.constant';
import {
    ENUM_MARKETING_MESSAGE_STATUS as S,
    ENUM_MARKETING_SKIP_REASON,
} from '../../enums/marketing-send.enum';
import { IMarketingSendStats } from '../../interfaces/marketing-send.interface';
import { MarketingMessageEntity } from '../entities/marketing-message.entity';

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

    async stats(sendId: string): Promise<IMarketingSendStats> {
        const [row]: Record<keyof IMarketingSendStats, string | null>[] =
            await this.em.getConnection().execute(
                `
            WITH m AS (
                SELECT * FROM marketing_messages WHERE send_id = ?::uuid
            ), o AS (
                SELECT DISTINCT ON (o.id) o.id, o.customer_id, o.total
                FROM m
                JOIN orders o ON o.customer_id = m.customer_id
                    AND o.ordered_at >= m.sent_at
                    AND o.ordered_at < m.sent_at + make_interval(days => ?)
                    AND o.status <> '${ENUM_ORDER_STATUS.CANCELLED}'
                    AND o.deleted_at IS NULL
                WHERE m.status = '${S.SENT}'
            )
            SELECT
                (SELECT count(*) FROM m WHERE status = '${S.QUEUED}') AS queued,
                (SELECT count(*) FROM m WHERE status = '${S.SENT}') AS sent,
                (SELECT count(*) FROM m WHERE status = '${S.FAILED}') AS failed,
                (SELECT count(*) FROM m WHERE status = '${S.SKIPPED}') AS skipped,
                (SELECT count(*) FROM m WHERE replied_at IS NOT NULL) AS replied,
                (SELECT count(DISTINCT customer_id) FROM o) AS ordered,
                (SELECT coalesce(sum(total), 0) FROM o) AS revenue
            `,
                [sendId, MARKETING_ORDER_WINDOW_DAYS]
            );
        return {
            queued: Number(row.queued),
            sent: Number(row.sent),
            failed: Number(row.failed),
            skipped: Number(row.skipped),
            replied: Number(row.replied),
            ordered: Number(row.ordered),
            revenue: Number(row.revenue),
        };
    }
}
