/** Where one marketing message to a customer stands (#505). */
export enum ENUM_MARKETING_MESSAGE_STATUS {
    QUEUED = 'QUEUED',
    SENT = 'SENT',
    FAILED = 'FAILED',
    SKIPPED = 'SKIPPED',
}

/** Why an offer to a customer was not sent. */
export enum ENUM_MARKETING_SKIP_REASON {
    /** No channel the customer wrote on can carry offers. */
    NO_CHANNEL = 'NO_CHANNEL',
    /** Every channel's free window has closed ("quá 24 giờ"). */
    WINDOW_CLOSED = 'WINDOW_CLOSED',
    /** The customer opted out between planning and sending. */
    OPTED_OUT = 'OPTED_OUT',
    /** The platform blocked the page from sending, so the rest of the send stopped. */
    ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
    /** Paced past the shop's closing hour that day, so it was not sent. */
    SEND_HOURS_ENDED = 'SEND_HOURS_ENDED',
}

export enum ENUM_MARKETING_SEND_PROCESS {
    DELIVER = 'deliver',
}
