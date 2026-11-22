import {
    CUSTOMER_MARKETING_OPT_OUT_KEYWORDS,
    CUSTOMER_MARKETING_OPT_OUT_REPLY,
    CUSTOMER_MARKETING_OPT_OUT_REPLY_LANGUAGE,
} from '../constants/customer-marketing.constant';

/** A message or keyword as compared: NFC, lower case, outer spaces and punctuation trimmed. */
export function optOutWord(text: string | null | undefined): string {
    return (text ?? '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '');
}

/**
 * True when the whole message is an opt-out keyword: by default "dừng",
 * "dung" or "stop", in any case, with surrounding spaces and punctuation
 * ignored. A sentence that contains the word is an ordinary message. A
 * workspace can set its own keywords (Cài đặt gửi tin, #505).
 */
export function isMarketingOptOutMessage(
    text: string | null | undefined,
    keywords: readonly string[] = CUSTOMER_MARKETING_OPT_OUT_KEYWORDS
): boolean {
    const word = optOutWord(text);
    return !!word && keywords.includes(word);
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
