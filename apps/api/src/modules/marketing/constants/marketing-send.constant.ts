import { ENUM_MARKETING_TODO } from '../enums/marketing-overview.enum';
import { IMarketingSendStats } from '../interfaces/marketing-send.interface';

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

export const MARKETING_SEND_QUEUE = 'marketing-send';

/** Cloud Task name prefix; the suffix is the `marketing_messages` row id. */
export const MARKETING_SEND_TASK_PREFIX = 'marketing-send-';

/** Reached customers are read in pages of this many when a send starts. */
export const MARKETING_SEND_PAGE_SIZE = 500;

/**
 * Offers a page (Account) gets per minute within one send: the send's
 * offers on each page are scheduled in minute buckets of this many, so a
 * big send is spread out rather than all at its start. The count is per
 * send: two sends started together on one page each get this many. Within
 * a bucket the queue's own dispatch limit spaces the tasks.
 */
export const MARKETING_SEND_PER_ACCOUNT_PER_MINUTE = 30;

/** Tasks created at once when a send starts. */
export const MARKETING_SEND_ENQUEUE_BATCH = 20;

/** An order within this long of an offer counts towards it. */
export const MARKETING_ORDER_WINDOW_DAYS = 7;

/** The quick reply that opts out; its value is the shop's stop keyword. */
export const MARKETING_STOP_ACTION_ID = 'marketing.stop';

/** The stop quick reply's label, by chatbot language. */
export const MARKETING_STOP_LABEL: Record<string, string> = {
    vi: 'Không nhận nữa',
    en: 'Stop offers',
};

/** The last line on channels without quick replies, by chatbot language. */
export const MARKETING_STOP_HINT: Record<string, (keyword: string) => string> =
    {
        vi: keyword =>
            `Nhắn "${keyword}" nếu bạn không muốn nhận tin ưu đãi nữa.`,
        en: keyword => `Reply "${keyword}" to stop receiving offers.`,
    };

/** Placeholders an offer's text may hold, filled in for each customer. */
export const MARKETING_TEXT_NAME = '{name}';
export const MARKETING_TEXT_PRODUCT = '{product}';

/** What fills a placeholder the customer has no value for, by chatbot language. */
export const MARKETING_TEXT_FALLBACK: Record<
    string,
    { name: string; product: string }
> = {
    vi: { name: 'bạn', product: 'sản phẩm bạn quan tâm' },
    en: { name: 'there', product: 'the product you asked about' },
};

export const MARKETING_SEND_MAX_NAME_LENGTH = 120;
export const MARKETING_SEND_MAX_TEXT_LENGTH = 1000;
export const MARKETING_SEND_LIST_AVAILABLE_SEARCH = ['name'];
export const MARKETING_SEND_LIST_AVAILABLE_ORDER_BY = [
    'createdAt',
    'name',
    'sent',
    'replyRate',
    'lastSentAt',
];

/** A send's results before any offer went out. */
export const MARKETING_SEND_EMPTY_STATS: IMarketingSendStats = {
    queued: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    replied: 0,
    ordered: 0,
    revenue: 0,
    optedOut: 0,
    lastSentAt: null,
};

/** Stages about a purchase: their offers name the product bought first. */
export const MARKETING_SEND_BOUGHT_PRESETS: ENUM_MARKETING_TODO[] = [
    ENUM_MARKETING_TODO.CROSS_SELL,
    ENUM_MARKETING_TODO.REPURCHASE,
    ENUM_MARKETING_TODO.WIN_BACK,
];
