/**
 * Where a Customer is in the buying journey (Mới biết → Mua nhiều lần). Moves
 * forward only, except when an operator edits it. "Ngủ đông" is not a stage:
 * it is computed from the last message (see CUSTOMER_MARKETING_DORMANT_DAYS).
 */
export enum ENUM_CUSTOMER_JOURNEY_STAGE {
    /** Mới biết: first message or source link. */
    NEW = 'NEW',
    /** Quan tâm: asked about the shop or a product group. */
    INTERESTED = 'INTERESTED',
    /** Hỏi giá: asked price, shipping or how to order. */
    ASKED_PRICE = 'ASKED_PRICE',
    /** Mua 1 lần: first confirmed order. */
    BOUGHT_ONCE = 'BOUGHT_ONCE',
    /** Mua nhiều lần: second confirmed order. */
    BOUGHT_REPEAT = 'BOUGHT_REPEAT',
}

/** Whether the shop may send this Customer offers. */
export enum ENUM_CUSTOMER_MARKETING_PERMISSION {
    /** Chưa đồng ý: the default. */
    PENDING = 'PENDING',
    /** Đồng ý. */
    GRANTED = 'GRANTED',
    /** Tạm ngưng đến <date>: `permissionUntil`. */
    PAUSED = 'PAUSED',
    /** Đã dừng vĩnh viễn: never expires. */
    STOPPED = 'STOPPED',
}

export enum ENUM_MARKETING_EVENT_KIND {
    STAGE = 'STAGE',
    PERMISSION = 'PERMISSION',
    /** The agent asked the one-time consent question. */
    CONSENT_ASKED = 'CONSENT_ASKED',
    /** The "Khó chịu" flag. */
    HOSTILE = 'HOSTILE',
    /** "Tạm hoãn <product group> đến <date>": old and new until dates. */
    REACTION = 'REACTION',
    /**
     * Interest or a price question, dated, per product group (or the shop in
     * general). The value is the stage it stands for.
     */
    INTENT = 'INTENT',
    /** The customer arrived through a tracked link: `trackedLinkId`. */
    SOURCE = 'SOURCE',
}

/** Who made a marketing label change. */
export enum ENUM_MARKETING_EVENT_ACTOR {
    /** The agent, during a conversation. */
    BOT = 'BOT',
    /** The end-of-conversation classifier. */
    CLASSIFIER = 'CLASSIFIER',
    /** A member in the app. */
    OPERATOR = 'OPERATOR',
    /** A Client credential (MCP or the public API). */
    CLIENT = 'CLIENT',
    /** A built-in rule: the opt-out keyword, a first message, a merge, an order. */
    RULE = 'RULE',
}

/** What the agent's `set_marketing_permission` tool records. */
export enum ENUM_CUSTOMER_MARKETING_AGENT_ACTION {
    /** The agent just asked the one-time consent question. */
    ASKED = 'ASKED',
    GRANTED = 'GRANTED',
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
}

/** Where a workspace's 90-day marketing backfill (#500) stands. */
export enum ENUM_MARKETING_BACKFILL_STATUS {
    /** Never started; only in responses, never stored. */
    NOT_STARTED = 'NOT_STARTED',
    RUNNING = 'RUNNING',
    DONE = 'DONE',
    /** Stopped at its token cap; starting again resumes from the cursor. */
    STOPPED_BUDGET = 'STOPPED_BUDGET',
}
