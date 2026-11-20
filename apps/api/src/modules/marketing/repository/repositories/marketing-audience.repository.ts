import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    ENUM_MARKETING_AUDIENCE_EXCLUSION as X,
    ENUM_MARKETING_AUDIENCE_FIELD as F,
    ENUM_MARKETING_AUDIENCE_MATCH,
    ENUM_MARKETING_AUDIENCE_OPERATOR as O,
} from '../../enums/marketing-audience.enum';
import {
    IMarketingAudience,
    IMarketingAudienceCondition,
    IMarketingAudiencePreviewRow,
    IMarketingSql,
} from '../../interfaces/marketing-audience.interface';
import {
    K,
    LIVE,
    P,
    PAUSED,
    S,
    TODO_CONDITIONS,
    TODO_DEFERRED,
    deferredOn,
    num,
} from '../marketing.sql';

// Condition values are always bound through `?`; only enum values and
// column names are inlined.
const WINDOW = `w AS (SELECT ?::uuid AS ws, ?::timestamptz AS now)`;

const CONFIRMED_ORDERS = `FROM orders o
    WHERE o.customer_id = l.id
        AND o.status = 'CONFIRMED'
        AND o.deleted_at IS NULL`;

const LAST_PRICE_QUESTION = `(
    SELECT MAX(e.created_at) FROM marketing_events e
    WHERE e.customer_id = l.id
        AND e.kind = '${K.INTENT}'
        AND e.new_value = '${S.ASKED_PRICE}'
        AND e.deleted_at IS NULL
)`;

const ORDERED_AFTER_PRICE = `EXISTS (
    SELECT 1 ${CONFIRMED_ORDERS} AND o.ordered_at > ${LAST_PRICE_QUESTION}
)`;

/** Before the first recorded message, a customer's first contact counts. */
const LAST_MESSAGE = `COALESCE(l.last_inbound_at, l.created_at)`;

const notIf = (operator: O, sql: string): string =>
    operator === O.NOT_IN ? `NOT ${sql}` : sql;

const compare = (operator: O): string => (operator === O.AT_MOST ? '<=' : '>=');

/** One condition as a boolean SQL expression over `l` and `w`. */
const conditionSql = (c: IMarketingAudienceCondition): IMarketingSql => {
    const values = c.values ?? [];
    switch (c.field) {
        case F.STAGE:
            return {
                sql: `l.stage ${c.operator === O.NOT_IN ? 'NOT IN' : 'IN'} (?)`,
                params: [values],
            };
        case F.PRODUCT_GROUP_ASKED:
            return {
                sql: `EXISTS (
                    SELECT 1 FROM marketing_events e
                    WHERE e.customer_id = l.id
                        AND e.kind = '${K.INTENT}'
                        AND e.deleted_at IS NULL
                        AND e.product_group_id IN (?)
                )`,
                params: [values],
            };
        case F.PRODUCT_GROUP_BOUGHT:
            return {
                sql: `EXISTS (
                    SELECT 1 FROM orders o
                    JOIN order_items oi
                        ON oi.order_id = o.id AND oi.deleted_at IS NULL
                    WHERE o.customer_id = l.id
                        AND o.status = 'CONFIRMED'
                        AND o.deleted_at IS NULL
                        AND oi.product_group_id IN (?)
                )`,
                params: [values],
            };
        case F.LAST_MESSAGE:
            return {
                sql:
                    c.operator === O.WITHIN_DAYS
                        ? `${LAST_MESSAGE} >= w.now - make_interval(days => ?)`
                        : `${LAST_MESSAGE} < w.now - make_interval(days => ?)`,
                params: [c.number],
            };
        case F.ORDERED_AFTER_PRICE:
            return {
                sql:
                    c.operator === O.YES
                        ? ORDERED_AFTER_PRICE
                        : `${LAST_PRICE_QUESTION} IS NOT NULL AND NOT ${ORDERED_AFTER_PRICE}`,
                params: [],
            };
        case F.ORDER_COUNT:
            return {
                sql: `(SELECT COUNT(*) ${CONFIRMED_ORDERS}) ${compare(c.operator)} ?`,
                params: [c.number],
            };
        case F.TOTAL_SPEND:
            return {
                sql: `(SELECT COALESCE(SUM(o.total), 0) ${CONFIRMED_ORDERS}) ${compare(c.operator)} ?`,
                params: [c.number],
            };
        case F.LABEL:
            return {
                sql: notIf(
                    c.operator,
                    `EXISTS (
                        SELECT 1 FROM customer_tag_assignments a
                        WHERE a.customer_id = l.id
                            AND a.deleted_at IS NULL
                            AND a.tag_id IN (?)
                    )`
                ),
                params: [values],
            };
        case F.CHANNEL:
            return {
                sql: notIf(
                    c.operator,
                    `EXISTS (
                        SELECT 1 FROM contact_points cp
                        WHERE cp.customer_id = l.id
                            AND cp.deleted_at IS NULL
                            AND cp.platform IN (?)
                    )`
                ),
                params: [values],
            };
    }
};

/** Who matches, and which product groups the audience is about. */
const audienceSql = (
    audience: IMarketingAudience
): { match: IMarketingSql; deferred?: IMarketingSql } => {
    if ('preset' in audience) {
        const deferred = TODO_DEFERRED[audience.preset];
        return {
            match: {
                sql: `COALESCE(${TODO_CONDITIONS[audience.preset]}, false)`,
                params: [],
            },
            deferred: deferred ? { sql: deferred, params: [] } : undefined,
        };
    }
    const parts = audience.conditions.map(conditionSql);
    const join =
        audience.match === ENUM_MARKETING_AUDIENCE_MATCH.ANY ? ' OR ' : ' AND ';
    const groups = audience.conditions
        .filter(
            c =>
                c.field === F.PRODUCT_GROUP_ASKED ||
                c.field === F.PRODUCT_GROUP_BOUGHT
        )
        .flatMap(c => c.values ?? []);
    return {
        match: {
            sql: `COALESCE(${parts.map(p => `(${p.sql})`).join(join)}, false)`,
            params: parts.flatMap(p => p.params),
        },
        deferred: groups.length
            ? { sql: deferredOn('?'), params: [groups] }
            : undefined,
    };
};

/**
 * The matching customers with the reason each one is left out (NULL when
 * the audience reaches them), as the `picked` CTE. Placeholders run in text
 * order: the window, the deferral groups, then the conditions.
 */
const picked = (audience: IMarketingAudience): IMarketingSql => {
    const { match, deferred } = audienceSql(audience);
    const sql = `${LIVE},
    picked AS (
        SELECT l.id, l.last_inbound_at,
               CASE
                   WHEN l.permission = '${P.STOPPED}' THEN '${X.STOPPED}'
                   WHEN l.hostile THEN '${X.HOSTILE}'
                   WHEN ${PAUSED} THEN '${X.PAUSED}'
                   ${deferred ? `WHEN ${deferred.sql} THEN '${X.DEFERRED}'` : ''}
               END AS reason
        FROM live l
        CROSS JOIN w
        WHERE ${match.sql}
    )`;
    return { sql, params: [...(deferred?.params ?? []), ...match.params] };
};

/** Audiences (#504): who a set of conditions or a preset reaches. */
@Injectable()
export class MarketingAudienceRepository extends DatabaseRepository<CustomerEntity> {
    constructor(em: EntityManager) {
        super(em, CustomerEntity);
    }

    private run(
        sql: string,
        params: unknown[]
    ): Promise<Record<string, unknown>[]> {
        return this.em.getConnection().execute(sql, params);
    }

    /** Matching customers by exclusion reason, and reached ones by channel. */
    async preview(
        workspaceId: string,
        audience: IMarketingAudience,
        now: Date
    ): Promise<IMarketingAudiencePreviewRow> {
        const window = [workspaceId, now.toISOString()];
        const p = picked(audience);
        const [reasons, channels] = await Promise.all([
            this.run(
                `WITH ${WINDOW}, ${p.sql}
                SELECT reason, COUNT(*) AS n FROM picked GROUP BY reason`,
                [...window, ...p.params]
            ),
            this.run(
                `WITH ${WINDOW}, ${p.sql}
                SELECT cp.platform, COUNT(DISTINCT p.id) AS n
                FROM picked p
                JOIN contact_points cp
                    ON cp.customer_id = p.id AND cp.deleted_at IS NULL
                WHERE p.reason IS NULL
                GROUP BY cp.platform
                ORDER BY n DESC, cp.platform`,
                [...window, ...p.params]
            ),
        ]);
        return {
            reasons: reasons.map(row => ({
                reason: (row.reason as X | null) ?? null,
                count: num(row.n),
            })),
            channels: channels.map(row => ({
                platform: row.platform as ENUM_ACCOUNT_TYPE,
                count: num(row.n),
            })),
        };
    }

    /** One page of reached customers, latest message first. */
    async reachedIds(
        workspaceId: string,
        audience: IMarketingAudience,
        now: Date,
        limit: number,
        offset: number
    ): Promise<string[]> {
        const p = picked(audience);
        const rows = await this.run(
            `WITH ${WINDOW}, ${p.sql}
            SELECT id FROM picked
            WHERE reason IS NULL
            ORDER BY last_inbound_at DESC NULLS LAST, id
            LIMIT ? OFFSET ?`,
            [workspaceId, now.toISOString(), ...p.params, limit, offset]
        );
        return rows.map(row => row.id as string);
    }
}
