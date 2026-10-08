import {
    HANDOFF_DEFAULT_REPLY,
    HANDOFF_DEFAULT_REPLY_LANGUAGE,
} from '../constants/handoff.constant';

/**
 * What the customer is told when the conversation is handed to staff: the
 * owner's own message, else the default in the chatbot's language.
 */
export function handoffReplyText(chatbot: {
    handoffMessage?: string | null;
    primaryLanguage?: string | null;
}): string {
    return (
        chatbot.handoffMessage ||
        HANDOFF_DEFAULT_REPLY[chatbot.primaryLanguage ?? ''] ||
        HANDOFF_DEFAULT_REPLY[HANDOFF_DEFAULT_REPLY_LANGUAGE]
    );
}
