/** Where one marketing message to a customer stands (#505). */
export enum ENUM_MARKETING_MESSAGE_STATUS {
    QUEUED = 'QUEUED',
    SENT = 'SENT',
    FAILED = 'FAILED',
    SKIPPED = 'SKIPPED',
}

/** Why the planner found no free route to a customer. */
export enum ENUM_MARKETING_SKIP_REASON {
    /** No channel the customer wrote on can carry offers. */
    NO_CHANNEL = 'NO_CHANNEL',
    /** Every channel's free window has closed ("quá 24 giờ"). */
    WINDOW_CLOSED = 'WINDOW_CLOSED',
}
