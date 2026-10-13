/**
 * Conversation memory: the recent messages apps/ai gets each Turn.
 *
 * The window does not slide one message at a time. It holds every message up
 * to `CONVERSATION_MEMORY_WINDOW_MAX`; past that it drops the oldest
 * `CONVERSATION_MEMORY_WINDOW_STEP` at once. Between two drops the prompt only
 * grows at its end, so the provider's prompt cache keeps hitting.
 */
export const CONVERSATION_MEMORY_WINDOW_MAX = 40;
export const CONVERSATION_MEMORY_WINDOW_STEP = 20;
