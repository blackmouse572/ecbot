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

/** Chỉ gửi 1 lần, or Tự gửi mỗi ngày to customers who newly match (#506). */
export enum ENUM_MARKETING_SEND_MODE {
    ONCE = 'ONCE',
    AUTO = 'AUTO',
}

/** How a customer who replied to an offer stands now, as Đã gửi shows it. */
export enum ENUM_MARKETING_REPLY_STATUS {
    /** Ordered within 7 days of the offer. */
    ORDERED = 'ORDERED',
    /** Opted out after the offer. */
    STOPPED = 'STOPPED',
    /** The conversation is handed to staff ("Chờ bạn"). */
    WAITING = 'WAITING',
    /** The bot is answering. */
    BOT = 'BOT',
}

export enum ENUM_MARKETING_SEND_PROCESS {
    DELIVER = 'deliver',
}
