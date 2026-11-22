/** Defaults for Cài đặt gửi tin (#505); the shop can change each one. */
export const MARKETING_SETTINGS_DEFAULT = {
    /** Offers per customer in any 30 days, all sends counted together. */
    maxPer30Days: 3,
    /** Unanswered offers in a row before the customer rests. */
    restAfter: 3,
    restDays: 30,
    /** Shop time, 24-hour "HH:mm". */
    sendFrom: '09:00',
    sendTo: '20:00',
} as const;

/** At most one offer per customer per shop day; not a setting. */
export const MARKETING_MAX_PER_DAY = 1;

/** A reply within this long counts as an answer to an offer. */
export const MARKETING_REPLY_WINDOW_HOURS = 72;

export const MARKETING_SETTINGS_MAX_PER_30_DAYS = 10;
export const MARKETING_SETTINGS_MAX_REST_AFTER = 10;
export const MARKETING_SETTINGS_MAX_REST_DAYS = 365;
export const MARKETING_SETTINGS_MAX_STOP_KEYWORDS = 10;
export const MARKETING_SETTINGS_MAX_STOP_KEYWORD_LENGTH = 30;
export const MARKETING_SETTINGS_MAX_STOP_REPLY_LENGTH = 500;
export const MARKETING_SETTINGS_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
