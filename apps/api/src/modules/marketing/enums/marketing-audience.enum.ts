/** What an audience condition looks at. */
export enum ENUM_MARKETING_AUDIENCE_FIELD {
    STAGE = 'STAGE',
    /** Asked about or showed interest in a product group. */
    PRODUCT_GROUP_ASKED = 'PRODUCT_GROUP_ASKED',
    /** Has a confirmed order with an item in a product group. */
    PRODUCT_GROUP_BOUGHT = 'PRODUCT_GROUP_BOUGHT',
    /** The customer's last message; before any, when they first wrote. */
    LAST_MESSAGE = 'LAST_MESSAGE',
    /** Placed a confirmed order after their last price question. */
    ORDERED_AFTER_PRICE = 'ORDERED_AFTER_PRICE',
    /** Confirmed orders. */
    ORDER_COUNT = 'ORDER_COUNT',
    /** Sum of confirmed orders, in minor units. */
    TOTAL_SPEND = 'TOTAL_SPEND',
    LABEL = 'LABEL',
    CHANNEL = 'CHANNEL',
}

export enum ENUM_MARKETING_AUDIENCE_OPERATOR {
    IN = 'IN',
    NOT_IN = 'NOT_IN',
    WITHIN_DAYS = 'WITHIN_DAYS',
    OLDER_THAN_DAYS = 'OLDER_THAN_DAYS',
    YES = 'YES',
    NO = 'NO',
    AT_LEAST = 'AT_LEAST',
    AT_MOST = 'AT_MOST',
}

/** "Khách khớp Tất cả / Bất kỳ điều kiện". */
export enum ENUM_MARKETING_AUDIENCE_MATCH {
    ALL = 'ALL',
    ANY = 'ANY',
}

/**
 * Why a matching customer is left out. They cannot be turned off; a
 * customer counts under the first reason that applies, in this order.
 */
export enum ENUM_MARKETING_AUDIENCE_EXCLUSION {
    STOPPED = 'STOPPED',
    HOSTILE = 'HOSTILE',
    PAUSED = 'PAUSED',
    /** "Tạm hoãn" on a product group the audience is about. */
    DEFERRED = 'DEFERRED',
    /** Already had the most offers allowed: today, or in 30 days. */
    CAPPED = 'CAPPED',
    /** Left offers unanswered too many times in a row, resting for now. */
    RESTING = 'RESTING',
}
