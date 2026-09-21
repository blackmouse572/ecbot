export const MESSAGE_DEBOUNCE_MS = 3000;

/**
 * Platform typing indicators (e.g. Messenger `typing_on`) auto-expire after
 * ~20s. A reply that runs tool roundtrips can take longer, so we re-send the
 * indicator on this interval to keep it visible until the reply is sent.
 */
export const MESSAGE_TYPING_REFRESH_MS = 9000;

/**
 * How many prior messages to load from the DB and inject as conversation
 * history into the AI request. The AI agent runs statelessly (no LangGraph
 * checkpointer), so apps/api — the message source of truth — supplies context
 * each turn. Bounded to keep prompt size + cost predictable.
 */
export const MESSAGE_HISTORY_WINDOW = 30;
