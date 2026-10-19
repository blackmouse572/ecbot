// Sent to the customer when the workspace is out of tokens and the chatbot
// has no fallback message of its own (agents made in the builder have none),
// so they are never left without a reply. Keyed by the chatbot's
// primaryLanguage; any other language gets FALLBACK_DEFAULT_REPLY_LANGUAGE.
export const FALLBACK_DEFAULT_REPLY: Record<string, string> = {
    vi: 'Xin lỗi, hiện mình chưa thể trả lời tin nhắn của bạn. Bạn vui lòng thử lại sau nhé.',
    en: "Sorry, I can't reply to your message right now. Please try again later.",
};

export const FALLBACK_DEFAULT_REPLY_LANGUAGE = 'en';
