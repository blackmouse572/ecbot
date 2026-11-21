import { CUSTOMER_MARKETING_DORMANT_DAYS } from '@app/modules/customer/constants/customer-marketing.constant';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
    ENUM_MARKETING_EVENT_KIND,
} from '@app/modules/customer/enums/customer-marketing.enum';
import {
    MARKETING_OVERVIEW_WEEK_DAYS,
    MARKETING_TODO_CROSS_SELL_FROM_DAYS,
    MARKETING_TODO_CROSS_SELL_TO_DAYS,
    MARKETING_TODO_INTERESTED_ACTIVE_DAYS,
    MARKETING_TODO_REPURCHASE_DUE_SHARE,
    MARKETING_TODO_REPURCHASE_LATE_DAYS,
    MARKETING_TODO_WIN_BACK_FROM_DAYS,
    MARKETING_TODO_WIN_BACK_TO_DAYS,
} from '../constants/marketing-overview.constant';
import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';

/*
 * SQL shared by Tổng quan and audiences, so a "Việc nên làm" row and its
 * preset audience count the same customers. Every query that uses these
 * defines a `w` CTE with the workspace (`w.ws`) and the clock (`w.now`), and
 * reads customers as `l` from LIVE.
 */

// Every value inlined below is an enum value or a numeric constant, never
// user input; the workspace and the clock are bound through `w`.
export const S = ENUM_CUSTOMER_JOURNEY_STAGE;
export const P = ENUM_CUSTOMER_MARKETING_PERMISSION;
export const K = ENUM_MARKETING_EVENT_KIND;
export const ago = (days: number): string =>
    `w.now - make_interval(days => ${days})`;
export const WEEK_START = ago(MARKETING_OVERVIEW_WEEK_DAYS);
export const BOUGHT = `('${S.BOUGHT_ONCE}', '${S.BOUGHT_REPEAT}')`;

/** Live customers with their state; no state row reads as Mới biết. */
export const LIVE = `live AS (
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

export const DORMANT = `(l.last_inbound_at IS NOT NULL OR l.last_order_at IS NOT NULL)
    AND COALESCE(l.last_inbound_at, '-infinity') < ${ago(CUSTOMER_MARKETING_DORMANT_DAYS)}
    AND COALESCE(l.last_order_at, '-infinity') < ${ago(CUSTOMER_MARKETING_DORMANT_DAYS)}`;

export const PAUSED = `l.permission = '${P.PAUSED}'
    AND (l.permission_until IS NULL OR l.permission_until > w.now)`;

/**
 * Customers who must not get offers: opted out, paused, or Khó chịu. A
 * customer with no state row has NULL here, so it is coalesced to false.
 */
export const BLOCKED = `COALESCE(l.permission = '${P.STOPPED}' OR (${PAUSED}) OR l.hostile, false)`;

/** Days since a timestamp, as a fraction. */
const ageDays = (column: string): string =>
    `EXTRACT(EPOCH FROM (w.now - ${column})) / 86400`;

/** One boolean column per "Việc nên làm" row. */
export const TODO_CONDITIONS: Record<ENUM_MARKETING_TODO, string> = {
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
/** Groups in the customer's last confirmed order, the one Mua lại is about. */
const LAST_ORDER_GROUPS = `SELECT oi.product_group_id
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
    WHERE o.customer_id = l.id
        AND o.status = 'CONFIRMED'
        AND o.deleted_at IS NULL
        AND o.ordered_at = l.last_order_at`;

/** The customer said "Tạm hoãn" to one of these product groups, still in force. */
export const deferredOn = (groups: string): string => `EXISTS (
    SELECT 1 FROM customer_product_reactions r
    WHERE r.customer_id = l.id
        AND r.deleted_at IS NULL
        AND r.until > w.now
        AND r.product_group_id IN (${groups})
)`;

/** Rows about a product group also leave out who deferred that group. */
export const TODO_DEFERRED: Partial<Record<ENUM_MARKETING_TODO, string>> = {
    [ENUM_MARKETING_TODO.REPURCHASE]: deferredOn(LAST_ORDER_GROUPS),
};

export const TODO_KEYS = Object.values(ENUM_MARKETING_TODO);

export const num = (value: unknown): number => Number(value ?? 0);
