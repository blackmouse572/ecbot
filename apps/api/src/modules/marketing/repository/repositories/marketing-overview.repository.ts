import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '@app/modules/customer/enums/customer-marketing.enum';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { MARKETING_OVERVIEW_MAX_MOVES } from '../../constants/marketing-overview.constant';
import { ENUM_MARKETING_TODO } from '../../enums/marketing-overview.enum';
import {
    IMarketingOverviewFunnelRow,
    IMarketingOverviewMoveRow,
    IMarketingOverviewNowRow,
    IMarketingOverviewOptOutRow,
    IMarketingOverviewStageRow,
    IMarketingOverviewWindow,
} from '../../interfaces/marketing-overview.interface';
import {
    BLOCKED,
    DORMANT,
    K,
    LIVE,
    P,
    PAUSED,
    S,
    TODO_CONDITIONS,
    TODO_DEFERRED,
    TODO_KEYS,
    num,
} from '../marketing.sql';

const WINDOW = `w AS (SELECT ?::uuid AS ws, ?::timestamptz AS now, ?::int AS days)`;
const windowParams = (w: IMarketingOverviewWindow): unknown[] => [
    w.workspaceId,
    w.now.toISOString(),
    w.days,
];
/** Start of the chosen range ("so với 7 / 30 / 90 ngày trước"). */
const PERIOD_START = `w.now - make_interval(days => w.days)`;

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

const col = (key: ENUM_MARKETING_TODO): string => `t_${key.toLowerCase()}`;

/**
 * Tổng quan numbers: group-bys over customers, their marketing state, stage
 * events and orders. Raw SQL, like the dashboard analytics.
 */
@Injectable()
export class MarketingOverviewRepository extends DatabaseRepository<CustomerEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerEntity);
    }

    private run(
        sql: string,
        params: unknown[]
    ): Promise<Record<string, unknown>[]> {
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
        const flags = TODO_KEYS.flatMap(key => [
            `COALESCE(${TODO_CONDITIONS[key]}, false) AS ${col(key)}`,
            ...(TODO_DEFERRED[key]
                ? [`COALESCE(${TODO_DEFERRED[key]}, false) AS ${col(key)}_d`]
                : []),
        ]).join(',\n');
        // A row leaves out who must not get offers, and who deferred the
        // product group it is about.
        const blockedFor = (key: ENUM_MARKETING_TODO): string =>
            TODO_DEFERRED[key] ? `(blocked OR ${col(key)}_d)` : 'blocked';
        const reached = (key: ENUM_MARKETING_TODO): string =>
            `(${col(key)} AND NOT ${blockedFor(key)})`;
        const counts = TODO_KEYS.map(
            key => `COUNT(*) FILTER (WHERE ${reached(key)}) AS ${col(key)}_n,
                COUNT(*) FILTER (WHERE ${col(key)} AND ${blockedFor(key)}) AS ${col(key)}_x`
        ).join(',\n');
        const any = TODO_KEYS.map(col).join(' OR ');
        const anyReached = TODO_KEYS.map(reached).join(' OR ');
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
                   COUNT(*) FILTER (WHERE ${anyReached}) AS any_n,
                   COUNT(*) FILTER (
                       WHERE (${any}) AND NOT (${anyReached})
                   ) AS any_x
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
