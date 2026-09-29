// Sent to the customer on a handoff when the chatbot has no handoff message
// of its own, so they are never left without a reply. Keyed by the chatbot's
// primaryLanguage; any other language gets HANDOFF_DEFAULT_REPLY_LANGUAGE.
export const HANDOFF_DEFAULT_REPLY: Record<string, string> = {
    vi: 'Mình đã chuyển tin nhắn của bạn cho nhân viên. Nhân viên sẽ trả lời bạn sớm nhất có thể.',
    en: "I've passed your message to our staff. They will reply as soon as they can.",
};

export const HANDOFF_DEFAULT_REPLY_LANGUAGE = 'en';
