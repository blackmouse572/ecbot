import {
    CUSTOMER_MARKETING_OPT_OUT_KEYWORDS,
    CUSTOMER_MARKETING_OPT_OUT_REPLY,
    CUSTOMER_MARKETING_OPT_OUT_REPLY_LANGUAGE,
} from '../constants/customer-marketing.constant';

/**
 * True when the whole message is the opt-out keyword: "dừng", "dung" or
 * "stop", in any case, with surrounding spaces and punctuation ignored. A
 * sentence that contains the word is an ordinary message.
 */
export function isMarketingOptOutMessage(
    text: string | null | undefined
): boolean {
    if (!text) return false;
    const word = text
        .normalize('NFC')
        .toLowerCase()
        .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '');
    return CUSTOMER_MARKETING_OPT_OUT_KEYWORDS.includes(word);
}

/** The bot's confirmation of an opt-out, in the chatbot's language. */
export function optOutReplyText(chatbot: {
    primaryLanguage?: string | null;
}): string {
    return (
        CUSTOMER_MARKETING_OPT_OUT_REPLY[chatbot.primaryLanguage ?? ''] ??
        CUSTOMER_MARKETING_OPT_OUT_REPLY[
            CUSTOMER_MARKETING_OPT_OUT_REPLY_LANGUAGE
        ]
    );
}
