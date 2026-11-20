import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { CUSTOMER_MARKETING_DORMANT_DAYS } from '@app/modules/customer/constants/customer-marketing.constant';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
    ENUM_MARKETING_EVENT_KIND,
} from '@app/modules/customer/enums/customer-marketing.enum';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    MARKETING_OVERVIEW_MAX_MOVES,
    MARKETING_OVERVIEW_WEEK_DAYS,
    MARKETING_TODO_CROSS_SELL_FROM_DAYS,
    MARKETING_TODO_CROSS_SELL_TO_DAYS,
    MARKETING_TODO_INTERESTED_ACTIVE_DAYS,
    MARKETING_TODO_REPURCHASE_DUE_SHARE,
    MARKETING_TODO_REPURCHASE_LATE_DAYS,
    MARKETING_TODO_WIN_BACK_FROM_DAYS,
    MARKETING_TODO_WIN_BACK_TO_DAYS,
} from '../../constants/marketing-overview.constant';
import { ENUM_MARKETING_TODO } from '../../enums/marketing-overview.enum';
import {
    IMarketingOverviewFunnelRow,
    IMarketingOverviewMoveRow,
    IMarketingOverviewNowRow,
    IMarketingOverviewOptOutRow,
    IMarketingOverviewStageRow,
    IMarketingOverviewWindow,
} from '../../interfaces/marketing-overview.interface';

// Every value inlined below is an enum value or a numeric constant, never
// user input; the workspace and the clock are bound through `w`.
const S = ENUM_CUSTOMER_JOURNEY_STAGE;
const P = ENUM_CUSTOMER_MARKETING_PERMISSION;
const K = ENUM_MARKETING_EVENT_KIND;
const ago = (days: number): string => `w.now - make_interval(days => ${days})`;
const WEEK_START = ago(MARKETING_OVERVIEW_WEEK_DAYS);
const BOUGHT = `('${S.BOUGHT_ONCE}', '${S.BOUGHT_REPEAT}')`;

const WINDOW = `w AS (SELECT ?::uuid AS ws, ?::timestamptz AS now, ?::int AS days)`;
const windowParams = (w: IMarketingOverviewWindow): unknown[] => [
    w.workspaceId,
    w.now.toISOString(),
    w.days,
];
/** Start of the chosen range ("so với 7 / 30 / 90 ngày trước"). */
const PERIOD_START = `w.now - make_interval(days => w.days)`;

/** Live customers with their state; no state row reads as Mới biết. */
const LIVE = `live AS (
    SELECT c.id, c.created_at, COALESCE(s.stage, '${S.NEW}') AS stage,
           s.permission, s.permission_until, s.hostile,
           s.last_inbound_at, s.last_order_at
    FROM customers c
    CROSS JOIN w
    LEFT JOIN customer_marketing_states s
        ON s.customer_id = c.id AND s.deleted_at IS NULL
    WHERE c.workspace_id = w.ws
        AND c.deleted_at IS NULL
        AND c.merged_into_customer_id IS NULL
)`;

/**
 * Each customer's stage at the start of the range: the stage before their
 * first move since then, or today's stage when they did not move. Customers
 * who arrived within the range had none (NULL). A first event with no old value is a customer
 * without a state row, which reads as Mới biết.
 */
const WAS = `${LIVE},
first_move AS (
    SELECT DISTINCT ON (e.customer_id) e.customer_id, e.old_value
    FROM marketing_events e
    CROSS JOIN w
    WHERE e.workspace_id = w.ws
        AND e.kind = '${K.STAGE}'
        AND e.deleted_at IS NULL
        AND e.created_at >= ${PERIOD_START}
    ORDER BY e.customer_id, e.created_at, e.id
),
was AS (
    SELECT l.id, l.stage AS now_stage,
           CASE
               WHEN l.created_at >= ${PERIOD_START} THEN NULL
               WHEN f.customer_id IS NOT NULL
                   THEN COALESCE(f.old_value, '${S.NEW}')
               ELSE l.stage
           END AS then_stage
    FROM live l
    CROSS JOIN w
    LEFT JOIN first_move f ON f.customer_id = l.id
)`;

const DORMANT = `(l.last_inbound_at IS NOT NULL OR l.last_order_at IS NOT NULL)
    AND COALESCE(l.last_inbound_at, '-infinity') < ${ago(CUSTOMER_MARKETING_DORMANT_DAYS)}
    AND COALESCE(l.last_order_at, '-infinity') < ${ago(CUSTOMER_MARKETING_DORMANT_DAYS)}`;

const PAUSED = `l.permission = '${P.PAUSED}'
    AND (l.permission_until IS NULL OR l.permission_until > w.now)`;

/**
 * Customers who must not get offers: opted out, paused, or Khó chịu. A
 * customer with no state row has NULL here, so it is coalesced to false.
 */
const BLOCKED = `COALESCE(l.permission = '${P.STOPPED}' OR (${PAUSED}) OR l.hostile, false)`;

/** Days since a timestamp, as a fraction. */
const ageDays = (column: string): string =>
    `EXTRACT(EPOCH FROM (w.now - ${column})) / 86400`;

/** One boolean column per "Việc nên làm" row. */
const TODO_CONDITIONS: Record<ENUM_MARKETING_TODO, string> = {
    [ENUM_MARKETING_TODO.NEW]: `l.created_at >= ${WEEK_START}`,
    [ENUM_MARKETING_TODO.INTERESTED]: `l.stage = '${S.INTERESTED}'
        AND l.last_inbound_at >= ${ago(MARKETING_TODO_INTERESTED_ACTIVE_DAYS)}`,
    [ENUM_MARKETING_TODO.ASKED_PRICE]: `l.stage = '${S.ASKED_PRICE}'
        AND EXISTS (
            SELECT 1 FROM marketing_events e
            WHERE e.customer_id = l.id
                AND e.kind = '${K.INTENT}'
                AND e.new_value = '${S.ASKED_PRICE}'
                AND e.deleted_at IS NULL
                AND e.created_at >= ${WEEK_START}
        )`,
    [ENUM_MARKETING_TODO.CROSS_SELL]: `l.stage = '${S.BOUGHT_ONCE}'
        AND l.last_order_at <= ${ago(MARKETING_TODO_CROSS_SELL_FROM_DAYS)}
        AND l.last_order_at > ${ago(MARKETING_TODO_CROSS_SELL_TO_DAYS)}`,
    [ENUM_MARKETING_TODO.REPURCHASE]: `l.stage IN ${BOUGHT}
        AND EXISTS (
            SELECT 1
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
            JOIN product_groups g ON g.id = oi.product_group_id AND g.deleted_at IS NULL
            WHERE o.customer_id = l.id
                AND o.status = 'CONFIRMED'
                AND o.deleted_at IS NULL
                AND o.ordered_at = l.last_order_at
                AND COALESCE(g.learned_repurchase_days, g.default_repurchase_days) > 0
                AND ${ageDays('o.ordered_at')}
                    >= ${MARKETING_TODO_REPURCHASE_DUE_SHARE} * COALESCE(g.learned_repurchase_days, g.default_repurchase_days)
                AND ${ageDays('o.ordered_at')}
                    < COALESCE(g.learned_repurchase_days, g.default_repurchase_days) + ${MARKETING_TODO_REPURCHASE_LATE_DAYS}
        )`,
    [ENUM_MARKETING_TODO.WIN_BACK]: `l.stage IN ${BOUGHT}
        AND l.last_order_at <= ${ago(MARKETING_TODO_WIN_BACK_FROM_DAYS)}
        AND l.last_order_at > ${ago(MARKETING_TODO_WIN_BACK_TO_DAYS)}
        AND COALESCE(l.last_inbound_at, '-infinity') < ${ago(MARKETING_TODO_WIN_BACK_FROM_DAYS)}`,
};
const TODO_KEYS = Object.values(ENUM_MARKETING_TODO);
const col = (key: ENUM_MARKETING_TODO): string => `t_${key.toLowerCase()}`;

const num = (value: unknown): number => Number(value ?? 0);

/**
 * Tổng quan numbers: group-bys over customers, their marketing state, stage
 * events and orders. Raw SQL, like the dashboard analytics.
 */
@Injectable()
export class MarketingOverviewRepository extends DatabaseRepository<CustomerEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerEntity);
    }

    private run<T = Record<string, unknown>>(
        sql: string,
        params: unknown[]
    ): Promise<T[]> {
        return this.em.getConnection().execute(sql, params);
    }

    /** Customers per stage now and at the start of the range. */
    async stageCounts(
        w: IMarketingOverviewWindow
    ): Promise<IMarketingOverviewStageRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}, ${WAS}
            SELECT stage, SUM(cur) AS current, SUM(prev) AS previous
            FROM (
                SELECT now_stage AS stage, 1 AS cur, 0 AS prev FROM was
                UNION ALL
                SELECT then_stage, 0, 1 FROM was WHERE then_stage IS NOT NULL
            ) x
            GROUP BY stage`,
            windowParams(w)
        );
        return rows.map(row => ({
            stage: row.stage as ENUM_CUSTOMER_JOURNEY_STAGE,
            current: num(row.current),
            previous: num(row.previous),
        }));
    }

    /** Moves within the range, from the stage then to the stage now. */
    async moves(
        w: IMarketingOverviewWindow
    ): Promise<IMarketingOverviewMoveRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}, ${WAS}
            SELECT COALESCE(then_stage, '${S.NEW}') AS from_stage,
                   now_stage AS to_stage,
                   COUNT(*) AS n
            FROM was
            WHERE COALESCE(then_stage, '${S.NEW}') <> now_stage
            GROUP BY 1, 2
            ORDER BY n DESC, 1, 2
            LIMIT ${MARKETING_OVERVIEW_MAX_MOVES}`,
            windowParams(w)
        );
        return rows.map(row => ({
            from: row.from_stage as ENUM_CUSTOMER_JOURNEY_STAGE,
            to: row.to_stage as ENUM_CUSTOMER_JOURNEY_STAGE,
            count: num(row.n),
        }));
    }

    /** Customers per stage now, by the channel they first wrote from. */
    async funnel(
        w: IMarketingOverviewWindow
    ): Promise<IMarketingOverviewFunnelRow[]> {
        const rows = await this.run(
            `WITH ${WINDOW}, ${LIVE}
            SELECT fp.platform, l.stage, COUNT(*) AS n
            FROM live l
            JOIN LATERAL (
                SELECT cp.platform
                FROM contact_points cp
                WHERE cp.customer_id = l.id AND cp.deleted_at IS NULL
                ORDER BY cp.created_at
                LIMIT 1
            ) fp ON true
            GROUP BY fp.platform, l.stage`,
            windowParams(w)
        );
        return rows.map(row => ({
            platform: row.platform as IMarketingOverviewFunnelRow['platform'],
            stage: row.stage as ENUM_CUSTOMER_JOURNEY_STAGE,
            count: num(row.n),
        }));
    }

    /** Totals, Lâu không nhắn, paused, and the "Việc nên làm" rows. */
    async now(w: IMarketingOverviewWindow): Promise<IMarketingOverviewNowRow> {
        const flags = TODO_KEYS.map(
            key => `COALESCE(${TODO_CONDITIONS[key]}, false) AS ${col(key)}`
        ).join(',\n');
        const counts = TODO_KEYS.map(
            key => `COUNT(*) FILTER (WHERE ${col(key)} AND NOT blocked) AS ${col(key)}_n,
                COUNT(*) FILTER (WHERE ${col(key)} AND blocked) AS ${col(key)}_x`
        ).join(',\n');
        const any = TODO_KEYS.map(col).join(' OR ');
        const [row] = await this.run(
            `WITH ${WINDOW}, ${LIVE},
            flagged AS (
                SELECT ${BLOCKED} AS blocked,
                       COALESCE(${DORMANT}, false) AS dormant,
                       COALESCE(${PAUSED}, false) AS paused,
                       ${flags}
                FROM live l
                CROSS JOIN w
            )
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE dormant) AS dormant,
                   COUNT(*) FILTER (WHERE paused) AS paused,
                   ${counts},
                   COUNT(*) FILTER (WHERE (${any}) AND NOT blocked) AS any_n,
                   COUNT(*) FILTER (WHERE (${any}) AND blocked) AS any_x
            FROM flagged`,
            windowParams(w)
        );
        const todos = Object.fromEntries(
            TODO_KEYS.map(key => [
                key,
                {
                    count: num(row?.[`${col(key)}_n`]),
                    excluded: num(row?.[`${col(key)}_x`]),
                },
            ])
        ) as IMarketingOverviewNowRow['todos'];
        return {
            total: num(row?.total),
            dormant: num(row?.dormant),
            paused: num(row?.paused),
            todos,
            todoTotal: { count: num(row?.any_n), excluded: num(row?.any_x) },
        };
    }

    /** Customers who opted out within the range, and in the range before. */
    async optOuts(
        w: IMarketingOverviewWindow
    ): Promise<IMarketingOverviewOptOutRow> {
        const [row] = await this.run(
            `WITH ${WINDOW}
            SELECT COUNT(DISTINCT e.customer_id) FILTER (
                       WHERE e.created_at >= ${PERIOD_START}
                   ) AS current,
                   COUNT(DISTINCT e.customer_id) FILTER (
                       WHERE e.created_at < ${PERIOD_START}
                   ) AS previous
            FROM marketing_events e
            CROSS JOIN w
            JOIN customers c ON c.id = e.customer_id
            WHERE e.workspace_id = w.ws
                AND e.kind = '${K.PERMISSION}'
                AND e.new_value = '${P.STOPPED}'
                AND e.deleted_at IS NULL
                AND e.created_at >= w.now - make_interval(days => w.days * 2)
                AND e.created_at <= w.now
                AND c.deleted_at IS NULL`,
            windowParams(w)
        );
        return { current: num(row?.current), previous: num(row?.previous) };
    }
}
