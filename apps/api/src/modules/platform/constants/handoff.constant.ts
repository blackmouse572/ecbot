// Sent to the customer on a handoff when the chatbot has no handoff message
// of its own, so they are never left without a reply. Keyed by the chatbot's
// primaryLanguage; any other language gets HANDOFF_DEFAULT_REPLY_LANGUAGE.
export const HANDOFF_DEFAULT_REPLY: Record<string, string> = {
    vi: 'Mình đã chuyển tin nhắn của bạn cho nhân viên. Nhân viên sẽ trả lời bạn sớm nhất có thể.',
    en: "I've passed your message to our staff. They will reply as soon as they can.",
};

export const HANDOFF_DEFAULT_REPLY_LANGUAGE = 'en';

// A default-keyword match hands off when the decision model is at least this
// sure the customer asked for a person; an unsure answer or a sure "no" leaves
// the message to the agent.
export const HANDOFF_INTENT_MIN_CONFIDENCE = 0.8;

// The check runs before any reply, with the typing indicator on: give up
// sooner than the agent builder's 15s, and hand off as before.
export const HANDOFF_INTENT_TIMEOUT_MS = 5000;

export const HANDOFF_INTENT_QUESTION_ID = 'wants_person';
export const HANDOFF_INTENT_WANTS_PERSON = 'wants_person';
