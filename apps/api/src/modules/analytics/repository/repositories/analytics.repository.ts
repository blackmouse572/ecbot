import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_CUSTOMER_TAG_SYSTEM_KEY } from '@app/modules/customer/enums/customer-tag.enum';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    ANALYTICS_NEGATIVE_KEYS,
    ANALYTICS_ORDER_KEYS,
    ANALYTICS_UNHAPPY_KEYS,
} from '../../constants/analytics.constant';
import {
    IAnalyticsBotChatbotRow,
    IAnalyticsBotDayRow,
    IAnalyticsChannelCountRow,
    IAnalyticsConversionDayRow,
    IAnalyticsCustomerDayRow,
    IAnalyticsFunnelRow,
    IAnalyticsHandoffReasonRow,
    IAnalyticsSentimentChannelRow,
    IAnalyticsSentimentDayRow,
    IAnalyticsTagRow,
    IAnalyticsUnhappyRow,
    IAnalyticsWindow,
} from '../../interfaces/analytics.interface';

// The system keys are enum values, so they are safe to inline as literals.
const list = (keys: ENUM_CUSTOMER_TAG_SYSTEM_KEY[]): string =>
    keys.map(key => `'${key}'`).join(', ');
const ORDER = list(ANALYTICS_ORDER_KEYS);
const NEGATIVE = list(ANALYTICS_NEGATIVE_KEYS);
const UNHAPPY = list(ANALYTICS_UNHAPPY_KEYS);
const POSITIVE = `'${ENUM_CUSTOMER_TAG_SYSTEM_KEY.POSITIVE}'`;
const COMPLAINT = `'${ENUM_CUSTOMER_TAG_SYSTEM_KEY.COMPLAINT}'`;
const HOT_LEAD = `'${ENUM_CUSTOMER_TAG_SYSTEM_KEY.HOT_LEAD}'`;
const HANDOFF = `'${ENUM_ACTIVITY_ACTION.CONVERSATION_HANDOFF}'`;

// `w` holds the period as instants (day boundaries in the timezone), the
// timezone for bucketing by day, and the workspace.
const WINDOW = `w AS (
    SELECT (?::date)::timestamp AT TIME ZONE ? AS start_at,
           (?::date)::timestamp AT TIME ZONE ? AS end_at,
           ?::text AS tz,
           ?::uuid AS ws
)`;
const windowParams = (w: IAnalyticsWindow): string[] => [
    w.from,
    w.timezone,
    w.to,
    w.timezone,
    w.timezone,
    w.workspaceId,
];

const LIVE_CUSTOMER = `c.workspace_id = w.ws
    AND c.deleted_at IS NULL
    AND c.merged_into_customer_id IS NULL`;
const inWindow = (column: string): string =>
    `${column} >= w.start_at AND ${column} < w.end_at`;
const day = (column: string): string =>
    `to_char(${column} AT TIME ZONE w.tz, 'YYYY-MM-DD')`;
/** The channel a customer first wrote from. */
const FIRST_CONTACT = `LATERAL (
    SELECT cp.platform, cp.display_sender_name
    FROM contact_points cp
    WHERE cp.customer_id = c.id AND cp.deleted_at IS NULL
    ORDER BY cp.created_at
    LIMIT 1
) fp ON true`;
const APPLIED_EVENT = `e.workspace_id = w.ws AND e.action = 'APPLIED'`;

/**
 * Conversations with a customer message in the period: whether staff wrote
 * in it and whether it was handed over (a handoff activity in the period).
 */
const BOT_CONVERSATIONS = `act AS (
    SELECT conv.id,
           conv.chatbot_id,
           MIN(m.date_sent) FILTER (WHERE m.author_type = 'USER') AS first_user_at,
           bool_or(m.author_type = 'OPERATOR') AS has_operator
    FROM conversations conv
    JOIN chatbots cb ON cb.id = conv.chatbot_id
    JOIN messages m ON m.conversation_id = conv.id AND m.deleted_at IS NULL
    CROSS JOIN w
    WHERE cb.workspace_id = w.ws
        AND conv.deleted_at IS NULL
        AND ${inWindow('m.date_sent')}
    GROUP BY conv.id, conv.chatbot_id
    HAVING COUNT(*) FILTER (WHERE m.author_type = 'USER') > 0
),
ho AS (
    SELECT DISTINCT ac.metadata->>'id' AS conversation_id
    FROM activities ac
    CROSS JOIN w
    WHERE ac.workspace_id = w.ws
        AND ac.action = ${HANDOFF}
        AND ${inWindow('ac.created_at')}
),
cs AS (
    SELECT act.*, ho.conversation_id IS NOT NULL AS handed_over
    FROM act
    LEFT JOIN ho ON ho.conversation_id = act.id::text
)`;

const num = (value: unknown): number => Number(value ?? 0);
const numOrNull = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);

/**
 * Cross-table aggregates for the workspace dashboard. Raw SQL: every number
 * is a group-by over customers, tag events, messages and activities.
 */
@Injectable()
export class AnalyticsRepository extends DatabaseRepository<CustomerEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerEntity);
    }

    private run<T = Record<string, unknown>>(
        sql: string,
        params: unknown[]
    ): Promise<T[]> {
        return this.em.getConnection().execute(sql, params);
    }

    /**
     * New customers per first channel and how far they got. Each step counts
     * the customers who reached it or a later one, so the funnel narrows.
     */
    async conversionByChannel(
        w: IAnalyticsWindow
    ): Promise<IAnalyticsFunnelRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW},
            nc AS (
                SELECT c.id, fp.platform
                FROM customers c
                CROSS JOIN w
                JOIN ${FIRST_CONTACT}
                WHERE ${LIVE_CUSTOMER} AND ${inWindow('c.created_at')}
            ),
            ev AS (
                SELECT e.customer_id,
                       bool_or(t.system_key IN (${ORDER})) AS ordered,
                       bool_or(t.system_key = ${HOT_LEAD}) AS hot
                FROM customer_tag_events e
                JOIN customer_tags t ON t.id = e.tag_id
                CROSS JOIN w
                WHERE ${APPLIED_EVENT}
                    AND t.system_key IN (${ORDER}, ${HOT_LEAD})
                    AND e.customer_id IN (SELECT id FROM nc)
                GROUP BY e.customer_id
            ),
            msg AS (
                SELECT cp.customer_id, COUNT(*) AS n
                FROM messages m
                JOIN conversations conv ON conv.id = m.conversation_id
                JOIN contact_points cp ON cp.id = conv.contact_point_id
                WHERE cp.customer_id IN (SELECT id FROM nc)
                    AND m.author_type = 'USER'
                    AND m.deleted_at IS NULL
                GROUP BY cp.customer_id
            )
            SELECT nc.platform,
                   COUNT(*) AS new_customers,
                   COUNT(*) FILTER (
                       WHERE COALESCE(msg.n, 0) >= 2 OR ev.hot OR ev.ordered
                   ) AS engaged,
                   COUNT(*) FILTER (WHERE ev.hot OR ev.ordered) AS hot_leads,
                   COUNT(*) FILTER (WHERE ev.ordered) AS orders
            FROM nc
            LEFT JOIN ev ON ev.customer_id = nc.id
            LEFT JOIN msg ON msg.customer_id = nc.id
            GROUP BY nc.platform
            ORDER BY orders DESC, new_customers DESC`,
            windowParams(w)
        );
        return rows.map(r => ({
            platform: r.platform as ENUM_ACCOUNT_TYPE,
            newCustomers: num(r.new_customers),
            engaged: num(r.engaged),
            hotLeads: num(r.hot_leads),
            orders: num(r.orders),
        }));
    }

    /** New customers and customers who ordered, per day. */
    async conversionDaily(
        w: IAnalyticsWindow
    ): Promise<IAnalyticsConversionDayRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}
            SELECT day, SUM(new_customers) AS new_customers, SUM(orders) AS orders
            FROM (
                SELECT ${day('c.created_at')} AS day, COUNT(*) AS new_customers, 0 AS orders
                FROM customers c
                CROSS JOIN w
                WHERE ${LIVE_CUSTOMER} AND ${inWindow('c.created_at')}
                GROUP BY 1
                UNION ALL
                SELECT ${day('e.created_at')}, 0, COUNT(DISTINCT e.customer_id)
                FROM customer_tag_events e
                JOIN customer_tags t ON t.id = e.tag_id
                CROSS JOIN w
                WHERE ${APPLIED_EVENT}
                    AND t.system_key IN (${ORDER})
                    AND ${inWindow('e.created_at')}
                GROUP BY 1
            ) x
            GROUP BY day`,
            windowParams(w)
        );
        return rows.map(r => ({
            day: r.day as string,
            newCustomers: num(r.new_customers),
            orders: num(r.orders),
        }));
    }

    /** Median hours from a new customer's first contact to their first order. */
    async medianHoursToOrder(w: IAnalyticsWindow): Promise<number | null> {
        const [row] = await this.run(
            `WITH ${WINDOW}
            SELECT percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (fo.first_order - c.created_at)) / 3600
            ) AS median
            FROM customers c
            CROSS JOIN w
            JOIN LATERAL (
                SELECT MIN(e.created_at) AS first_order
                FROM customer_tag_events e
                JOIN customer_tags t ON t.id = e.tag_id
                WHERE e.customer_id = c.id
                    AND e.action = 'APPLIED'
                    AND t.system_key IN (${ORDER})
            ) fo ON fo.first_order IS NOT NULL
            WHERE ${LIVE_CUSTOMER} AND ${inWindow('c.created_at')}`,
            windowParams(w)
        );
        return numOrNull(row?.median);
    }

    /** Sentiment tags applied per day (angry counts as negative). */
    async sentimentDaily(
        w: IAnalyticsWindow
    ): Promise<IAnalyticsSentimentDayRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}
            SELECT ${day('e.created_at')} AS day,
                   COUNT(*) FILTER (WHERE t.system_key = ${POSITIVE}) AS positive,
                   COUNT(*) FILTER (WHERE t.system_key IN (${NEGATIVE})) AS negative,
                   COUNT(*) FILTER (WHERE t.system_key = ${COMPLAINT}) AS complaint
            FROM customer_tag_events e
            JOIN customer_tags t ON t.id = e.tag_id
            CROSS JOIN w
            WHERE ${APPLIED_EVENT}
                AND t.system_key IN (${POSITIVE}, ${UNHAPPY})
                AND ${inWindow('e.created_at')}
            GROUP BY 1`,
            windowParams(w)
        );
        return rows.map(r => ({
            day: r.day as string,
            positive: num(r.positive),
            negative: num(r.negative),
            complaint: num(r.complaint),
        }));
    }

    /**
     * Conversations and sentiment per channel. A tag lands on the channel of
     * the conversation it was applied in, else the customer's first channel.
     */
    async sentimentByChannel(
        w: IAnalyticsWindow
    ): Promise<IAnalyticsSentimentChannelRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW},
            convs AS (
                SELECT a.type AS platform, COUNT(*) AS n
                FROM conversations conv
                JOIN chatbots cb ON cb.id = conv.chatbot_id
                JOIN accounts a ON a.id = conv.account_id
                CROSS JOIN w
                WHERE cb.workspace_id = w.ws
                    AND conv.deleted_at IS NULL
                    AND EXISTS (
                        SELECT 1 FROM messages m
                        WHERE m.conversation_id = conv.id
                            AND m.author_type = 'USER'
                            AND m.deleted_at IS NULL
                            AND ${inWindow('m.date_sent')}
                    )
                GROUP BY a.type
            ),
            sent AS (
                SELECT COALESCE(a.type, fp.platform) AS platform,
                       COUNT(*) FILTER (WHERE t.system_key = ${POSITIVE}) AS positive,
                       COUNT(*) FILTER (WHERE t.system_key IN (${NEGATIVE})) AS negative
                FROM customer_tag_events e
                JOIN customer_tags t ON t.id = e.tag_id
                JOIN customers c ON c.id = e.customer_id
                CROSS JOIN w
                LEFT JOIN conversations conv ON conv.id = e.conversation_id
                LEFT JOIN accounts a ON a.id = conv.account_id
                LEFT JOIN ${FIRST_CONTACT}
                WHERE ${APPLIED_EVENT}
                    AND t.system_key IN (${POSITIVE}, ${NEGATIVE})
                    AND ${inWindow('e.created_at')}
                GROUP BY 1
            )
            SELECT COALESCE(convs.platform, sent.platform) AS platform,
                   COALESCE(convs.n, 0) AS conversations,
                   COALESCE(sent.positive, 0) AS positive,
                   COALESCE(sent.negative, 0) AS negative
            FROM convs
            FULL JOIN sent ON sent.platform = convs.platform
            WHERE COALESCE(convs.platform, sent.platform) IS NOT NULL
            ORDER BY conversations DESC`,
            windowParams(w)
        );
        return rows.map(r => ({
            platform: r.platform as ENUM_ACCOUNT_TYPE,
            conversations: num(r.conversations),
            positive: num(r.positive),
            negative: num(r.negative),
        }));
    }

    /**
     * The latest customers tagged negative, angry or complaint in the period
     * who still carry that tag, newest first, one row per customer.
     */
    async unhappyCustomers(
        w: IAnalyticsWindow,
        limit: number
    ): Promise<IAnalyticsUnhappyRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW},
            latest AS (
                SELECT DISTINCT ON (e.customer_id)
                       e.customer_id,
                       COALESCE(e.conversation_id, lc.id) AS conversation_id,
                       COALESCE(c.name, fp.display_sender_name) AS name,
                       COALESCE(a.type, fp.platform) AS platform,
                       t.name AS tag_name,
                       t.emoji,
                       e.created_at AS at
                FROM customer_tag_events e
                JOIN customer_tags t ON t.id = e.tag_id
                JOIN customers c ON c.id = e.customer_id
                CROSS JOIN w
                LEFT JOIN ${FIRST_CONTACT}
                LEFT JOIN LATERAL (
                    SELECT conv.id, conv.account_id
                    FROM conversations conv
                    JOIN contact_points cp ON cp.id = conv.contact_point_id
                    WHERE cp.customer_id = c.id AND conv.deleted_at IS NULL
                    ORDER BY conv.last_message_at DESC NULLS LAST
                    LIMIT 1
                ) lc ON true
                LEFT JOIN conversations ec ON ec.id = e.conversation_id
                LEFT JOIN accounts a ON a.id = COALESCE(ec.account_id, lc.account_id)
                WHERE ${APPLIED_EVENT}
                    AND t.system_key IN (${UNHAPPY})
                    AND ${inWindow('e.created_at')}
                    AND ${LIVE_CUSTOMER}
                    AND EXISTS (
                        SELECT 1 FROM customer_tag_assignments ta
                        WHERE ta.customer_id = c.id
                            AND ta.tag_id = t.id
                            AND ta.deleted_at IS NULL
                    )
                ORDER BY e.customer_id, e.created_at DESC
            )
            SELECT * FROM latest ORDER BY at DESC LIMIT ?`,
            [...windowParams(w), limit]
        );
        return rows.map(r => ({
            customerId: r.customer_id as string,
            conversationId: (r.conversation_id as string | null) ?? null,
            name: (r.name as string | null) ?? null,
            platform: (r.platform as ENUM_ACCOUNT_TYPE | null) ?? null,
            tagName: r.tag_name as string,
            emoji: (r.emoji as string | null) ?? null,
            at: new Date(r.at as string),
        }));
    }

    /**
     * Conversations per day (by the first customer message in the period):
     * handed over, or resolved by the bot alone (no handoff, no staff reply).
     */
    async botDaily(w: IAnalyticsWindow): Promise<IAnalyticsBotDayRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}, ${BOT_CONVERSATIONS}
            SELECT ${day('cs.first_user_at')} AS day,
                   COUNT(*) AS conversations,
                   COUNT(*) FILTER (
                       WHERE NOT cs.handed_over AND NOT cs.has_operator
                   ) AS bot_resolved,
                   COUNT(*) FILTER (WHERE cs.handed_over) AS handed_over
            FROM cs
            CROSS JOIN w
            GROUP BY 1`,
            windowParams(w)
        );
        return rows.map(r => ({
            day: r.day as string,
            conversations: num(r.conversations),
            botResolved: num(r.bot_resolved),
            handedOver: num(r.handed_over),
        }));
    }

    /** The same counts per chatbot, with the median first reply and tool errors. */
    async botByChatbot(
        w: IAnalyticsWindow
    ): Promise<IAnalyticsBotChatbotRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}, ${BOT_CONVERSATIONS},
            tools AS (
                SELECT ti.chatbot_id,
                       COUNT(*) AS calls,
                       COUNT(*) FILTER (WHERE ti.status <> 'SUCCESS') AS errors
                FROM tool_invocations ti
                JOIN chatbots cb ON cb.id = ti.chatbot_id
                CROSS JOIN w
                WHERE cb.workspace_id = w.ws AND ${inWindow('ti.created_at')}
                GROUP BY ti.chatbot_id
            )
            SELECT cs.chatbot_id AS id,
                   cb.name,
                   COUNT(*) AS conversations,
                   COUNT(*) FILTER (
                       WHERE NOT cs.handed_over AND NOT cs.has_operator
                   ) AS bot_resolved,
                   COUNT(*) FILTER (WHERE cs.handed_over) AS handed_over,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY fr.seconds) AS first_reply_seconds,
                   COALESCE(MAX(tools.calls), 0) AS tool_calls,
                   COALESCE(MAX(tools.errors), 0) AS tool_errors
            FROM cs
            JOIN chatbots cb ON cb.id = cs.chatbot_id
            LEFT JOIN LATERAL (
                SELECT EXTRACT(EPOCH FROM (MIN(m.date_sent) - cs.first_user_at)) AS seconds
                FROM messages m
                WHERE m.conversation_id = cs.id
                    AND m.author_type = 'BOT'
                    AND m.deleted_at IS NULL
                    AND m.date_sent >= cs.first_user_at
            ) fr ON true
            LEFT JOIN tools ON tools.chatbot_id = cs.chatbot_id
            GROUP BY cs.chatbot_id, cb.name
            ORDER BY conversations DESC`,
            windowParams(w)
        );
        return rows.map(r => ({
            id: r.id as string,
            name: r.name as string,
            conversations: num(r.conversations),
            botResolved: num(r.bot_resolved),
            handedOver: num(r.handed_over),
            firstReplySeconds: numOrNull(r.first_reply_seconds),
            toolCalls: num(r.tool_calls),
            toolErrors: num(r.tool_errors),
        }));
    }

    /** Handoffs in the period by reason, with the tag behind a tag rule. */
    async handoffReasons(
        w: IAnalyticsWindow
    ): Promise<IAnalyticsHandoffReasonRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}
            SELECT ac.metadata->>'reason' AS reason,
                   t.id AS tag_id,
                   t.name AS tag_name,
                   t.emoji,
                   t.system_key,
                   COUNT(*) AS count
            FROM activities ac
            CROSS JOIN w
            LEFT JOIN customer_tags t
                ON t.id::text = ac.metadata->>'tagId' AND t.deleted_at IS NULL
            WHERE ac.workspace_id = w.ws
                AND ac.action = ${HANDOFF}
                AND ${inWindow('ac.created_at')}
            GROUP BY 1, 2, 3, 4, 5
            ORDER BY count DESC`,
            windowParams(w)
        );
        return rows.map(r => ({
            reason: (r.reason as string | null) ?? null,
            tagId: (r.tag_id as string | null) ?? null,
            tagName: (r.tag_name as string | null) ?? null,
            emoji: (r.emoji as string | null) ?? null,
            systemKey:
                (r.system_key as ENUM_CUSTOMER_TAG_SYSTEM_KEY | null) ?? null,
            count: num(r.count),
        }));
    }

    /** Live customers per tag now, tags without customers left out. */
    async customerTags(workspaceId: string): Promise<IAnalyticsTagRow[]> {
        const rows = await this.run(
            `SELECT t.id, t.name, t.emoji, COUNT(c.id) AS count
            FROM customer_tags t
            JOIN customer_tag_assignments a
                ON a.tag_id = t.id AND a.deleted_at IS NULL
            JOIN customers c
                ON c.id = a.customer_id
                AND c.deleted_at IS NULL
                AND c.merged_into_customer_id IS NULL
            WHERE t.workspace_id = ?::uuid AND t.deleted_at IS NULL
            GROUP BY t.id, t.name, t.emoji
            ORDER BY count DESC, t.name`,
            [workspaceId]
        );
        return rows.map(r => ({
            id: r.id as string,
            name: r.name as string,
            emoji: (r.emoji as string | null) ?? null,
            count: num(r.count),
        }));
    }

    async customerTotals(
        workspaceId: string
    ): Promise<{ total: number; untagged: number }> {
        const [row] = await this.run(
            `SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (
                       WHERE NOT EXISTS (
                           SELECT 1
                           FROM customer_tag_assignments a
                           JOIN customer_tags t
                               ON t.id = a.tag_id AND t.deleted_at IS NULL
                           WHERE a.customer_id = c.id AND a.deleted_at IS NULL
                       )
                   ) AS untagged
            FROM customers c
            WHERE c.workspace_id = ?::uuid
                AND c.deleted_at IS NULL
                AND c.merged_into_customer_id IS NULL`,
            [workspaceId]
        );
        return { total: num(row?.total), untagged: num(row?.untagged) };
    }

    /** Live customers by the channel they first wrote from. */
    async customersByChannel(
        workspaceId: string
    ): Promise<IAnalyticsChannelCountRow[]> {
        const rows = await this.run(
            `SELECT fp.platform, COUNT(*) AS count
            FROM customers c
            JOIN ${FIRST_CONTACT}
            WHERE c.workspace_id = ?::uuid
                AND c.deleted_at IS NULL
                AND c.merged_into_customer_id IS NULL
            GROUP BY fp.platform
            ORDER BY count DESC`,
            [workspaceId]
        );
        return rows.map(r => ({
            platform: r.platform as ENUM_ACCOUNT_TYPE,
            count: num(r.count),
        }));
    }

    /** New customers per day, and earlier customers who wrote that day. */
    async customersDaily(
        w: IAnalyticsWindow
    ): Promise<IAnalyticsCustomerDayRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW},
            fresh AS (
                SELECT ${day('c.created_at')} AS day, COUNT(*) AS n
                FROM customers c
                CROSS JOIN w
                WHERE ${LIVE_CUSTOMER} AND ${inWindow('c.created_at')}
                GROUP BY 1
            ),
            active AS (
                SELECT DISTINCT ${day('m.date_sent')} AS day,
                       c.id,
                       ${day('c.created_at')} AS created_day
                FROM messages m
                JOIN conversations conv ON conv.id = m.conversation_id
                JOIN contact_points cp ON cp.id = conv.contact_point_id
                JOIN customers c ON c.id = cp.customer_id
                CROSS JOIN w
                WHERE ${LIVE_CUSTOMER}
                    AND m.author_type = 'USER'
                    AND m.deleted_at IS NULL
                    AND ${inWindow('m.date_sent')}
            ),
            back AS (
                SELECT day, COUNT(*) AS n
                FROM active
                WHERE created_day < day
                GROUP BY day
            )
            SELECT COALESCE(fresh.day, back.day) AS day,
                   COALESCE(fresh.n, 0) AS new_customers,
                   COALESCE(back.n, 0) AS returning
            FROM fresh
            FULL JOIN back ON back.day = fresh.day`,
            windowParams(w)
        );
        return rows.map(r => ({
            day: r.day as string,
            newCustomers: num(r.new_customers),
            returning: num(r.returning),
        }));
    }
}
