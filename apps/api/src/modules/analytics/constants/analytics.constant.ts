import { ENUM_CUSTOMER_TAG_SYSTEM_KEY } from '@app/modules/customer/enums/customer-tag.enum';

export enum ENUM_ANALYTICS_RANGE {
    DAYS_7 = '7d',
    DAYS_30 = '30d',
    DAYS_90 = '90d',
}

export const ANALYTICS_RANGE_DAYS: Record<ENUM_ANALYTICS_RANGE, number> = {
    [ENUM_ANALYTICS_RANGE.DAYS_7]: 7,
    [ENUM_ANALYTICS_RANGE.DAYS_30]: 30,
    [ENUM_ANALYTICS_RANGE.DAYS_90]: 90,
};

/** Day boundaries when the app sends no timezone: most workspaces are in Vietnam. */
export const ANALYTICS_DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** Each section is cached this long per workspace, range and timezone. */
export const ANALYTICS_CACHE_TTL_MS = 10 * 60 * 1000;

export const ANALYTICS_UNHAPPY_LIMIT = 5;

/** An order is a customer tagged with either default order tag. */
export const ANALYTICS_ORDER_KEYS = [
    ENUM_CUSTOMER_TAG_SYSTEM_KEY.ORDER_PLACED,
    ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEW_ORDER,
];

/** Negative includes angry; complaint stays its own band. */
export const ANALYTICS_NEGATIVE_KEYS = [
    ENUM_CUSTOMER_TAG_SYSTEM_KEY.NEGATIVE,
    ENUM_CUSTOMER_TAG_SYSTEM_KEY.ANGRY,
];

export const ANALYTICS_UNHAPPY_KEYS = [
    ...ANALYTICS_NEGATIVE_KEYS,
    ENUM_CUSTOMER_TAG_SYSTEM_KEY.COMPLAINT,
];

/** Handoff reasons the app has a label for; anything else is "other". */
export const ANALYTICS_HANDOFF_REASONS = [
    'fallback_threshold',
    'keyword_trigger',
    'tag_trigger',
];

/**
 * Calls one client credential may make to the /client analytics routes per
 * window, all tabs together. An uncached call runs several aggregate queries.
 */
export const ANALYTICS_CLIENT_RATE_LIMIT = 20;
export const ANALYTICS_CLIENT_RATE_WINDOW_SECONDS = 60;
