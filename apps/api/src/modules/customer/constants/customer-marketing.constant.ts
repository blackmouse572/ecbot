import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../enums/customer-marketing.enum';

/** No message for this many days shows the Customer as "Ngủ đông". */
export const CUSTOMER_MARKETING_DORMANT_DAYS = 120;

/** Journey stages in order; a later index is further along. */
export const CUSTOMER_JOURNEY_STAGE_ORDER: ENUM_CUSTOMER_JOURNEY_STAGE[] = [
    ENUM_CUSTOMER_JOURNEY_STAGE.NEW,
    ENUM_CUSTOMER_JOURNEY_STAGE.INTERESTED,
    ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE,
    ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_ONCE,
    ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_REPEAT,
];

/**
 * When two Customers merge, the survivor keeps the permission that comes
 * first here: an opt-out on any channel always wins, and consent given on
 * one channel beats never asked.
 */
export const CUSTOMER_MARKETING_PERMISSION_MERGE_ORDER: ENUM_CUSTOMER_MARKETING_PERMISSION[] =
    [
        ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED,
        ENUM_CUSTOMER_MARKETING_PERMISSION.PAUSED,
        ENUM_CUSTOMER_MARKETING_PERMISSION.GRANTED,
        ENUM_CUSTOMER_MARKETING_PERMISSION.PENDING,
    ];

/**
 * A message that is only one of these words (any case, surrounding spaces and
 * punctuation ignored) opts the Customer out. "dung" is "dừng" typed without
 * diacritics; other accents ("dũng" is a name, "dùng" means use) do not count.
 */
export const CUSTOMER_MARKETING_OPT_OUT_KEYWORDS = ['dừng', 'dung', 'stop'];

/** The bot's one-line confirmation of an opt-out, by chatbot language. */
export const CUSTOMER_MARKETING_OPT_OUT_REPLY: Record<string, string> = {
    vi: 'Dạ, shop đã dừng gửi tin ưu đãi cho bạn. Bạn vẫn nhắn hỏi shop bất cứ lúc nào nhé.',
    en: 'Got it, we have stopped sending you offers. You can still message us any time.',
};
export const CUSTOMER_MARKETING_OPT_OUT_REPLY_LANGUAGE = 'vi';

/** Reasons the built-in rules write on their events. */
export const CUSTOMER_MARKETING_REASON_OPT_OUT_KEYWORD = 'opt_out_keyword';
export const CUSTOMER_MARKETING_REASON_FIRST_MESSAGE = 'first_message';
export const CUSTOMER_MARKETING_REASON_MERGE = 'customer_merge';
export const CUSTOMER_MARKETING_REASON_HOSTILE = 'hostile';

/** "Not now" from the agent pauses offers this long unless it says otherwise. */
export const CUSTOMER_MARKETING_AGENT_PAUSE_DAYS = 30;

/**
 * Hours after a customer's last message that the shop may still message them
 * for free on each channel; null means no limit (Telegram, once they pressed
 * Start). Channels missing here have no free route for offers.
 */
export const CUSTOMER_MARKETING_FREE_WINDOW_HOURS: Partial<
    Record<ENUM_ACCOUNT_TYPE, number | null>
> = {
    [ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE]: 24,
    [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE]: 24,
    [ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT]: 24,
    [ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS]: 24,
    [ENUM_ACCOUNT_TYPE.ZALO_PAGE]: 48,
    [ENUM_ACCOUNT_TYPE.TELEGRAM_BOT]: null,
};
