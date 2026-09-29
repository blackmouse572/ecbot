// Sent to the customer on a handoff when the chatbot has no handoff message
// of its own, so they are never left without a reply. Keyed by the chatbot's
// primaryLanguage; any other language gets HANDOFF_DEFAULT_REPLY_LANGUAGE.
export const HANDOFF_DEFAULT_REPLY: Record<string, string> = {
    vi: 'Cảm ơn bạn đã chờ. Nhân viên sẽ trả lời bạn trong thời gian sớm nhất.',
    en: 'Thanks for waiting. A staff member will reply to you shortly.',
};

export const HANDOFF_DEFAULT_REPLY_LANGUAGE = 'en';
