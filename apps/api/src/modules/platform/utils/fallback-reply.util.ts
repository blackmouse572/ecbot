import {
    FALLBACK_DEFAULT_REPLY,
    FALLBACK_DEFAULT_REPLY_LANGUAGE,
} from '../constants/fallback.constant';

/**
 * What the customer is told when the workspace is out of tokens: the owner's
 * fallback message, else the default in the chatbot's language.
 */
export function fallbackReplyText(chatbot: {
    fallbackMessage?: string | null;
    primaryLanguage?: string | null;
}): string {
    return (
        chatbot.fallbackMessage ||
        FALLBACK_DEFAULT_REPLY[chatbot.primaryLanguage ?? ''] ||
        FALLBACK_DEFAULT_REPLY[FALLBACK_DEFAULT_REPLY_LANGUAGE]
    );
}
