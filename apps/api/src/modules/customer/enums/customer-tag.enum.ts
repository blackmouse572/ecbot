/**
 * Stable meaning of a default tag, so analytics still finds it after the
 * owner renames the tag. Tags an owner creates have none.
 */
export enum ENUM_CUSTOMER_TAG_SYSTEM_KEY {
    HOT_LEAD = 'hot_lead',
    NEW_LEAD = 'new_lead',
    RETURNING_CUSTOMER = 'returning_customer',
    VIP = 'vip',
    POSITIVE = 'positive',
    NEGATIVE = 'negative',
    COMPLAINT = 'complaint',
    ANGRY = 'angry',
    NEW_ORDER = 'new_order',
    NEEDS_STAFF = 'needs_staff',
    NEW_BOOKING = 'new_booking',
    ORDER_PLACED = 'order_placed',
}

export enum ENUM_CUSTOMER_TAG_EVENT_ACTION {
    APPLIED = 'APPLIED',
    REMOVED = 'REMOVED',
}

/** Who applied or removed the tag. */
export enum ENUM_CUSTOMER_TAG_EVENT_ACTOR {
    /** The agent, during a conversation. */
    BOT = 'BOT',
    /** The end-of-conversation classifier. */
    CLASSIFIER = 'CLASSIFIER',
    /** A member in the app. */
    OPERATOR = 'OPERATOR',
    /** A Client credential (MCP or the public API). */
    CLIENT = 'CLIENT',
}
