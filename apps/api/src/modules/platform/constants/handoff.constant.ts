// Sent to the customer on a handoff when the chatbot has no handoff message
// of its own, so they are never left without a reply. Keyed by the chatbot's
// primaryLanguage; any other language gets HANDOFF_DEFAULT_REPLY_LANGUAGE.
export const HANDOFF_DEFAULT_REPLY: Record<string, string> = {
    vi: 'Mình đã chuyển tin nhắn của bạn cho nhân viên. Nhân viên sẽ trả lời bạn sớm nhất có thể.',
    en: "I've passed your message to our staff. They will reply as soon as they can.",
};

export const HANDOFF_DEFAULT_REPLY_LANGUAGE = 'en';

// A keyword match hands off only when the decision model is at least this sure
// the customer asked for a person; below it the agent answers the message.
export const HANDOFF_INTENT_MIN_CONFIDENCE = 0.8;

export const HANDOFF_INTENT_QUESTION_ID = 'wants_person';
export const HANDOFF_INTENT_WANTS_PERSON = 'wants_person';
