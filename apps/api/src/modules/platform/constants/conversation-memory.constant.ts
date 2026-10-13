/**
 * Conversation memory: the recent messages apps/ai gets each Turn, plus a
 * rolling summary of everything older.
 *
 * The window does not slide one message at a time. It holds every message the
 * summary does not cover yet, up to `CONVERSATION_MEMORY_WINDOW_MAX`; past that
 * it drops the oldest `CONVERSATION_MEMORY_WINDOW_STEP` at once, and those are
 * folded into the summary in the background. Between two drops the prompt only
 * grows at its end, so the provider's prompt cache keeps hitting.
 */
export const CONVERSATION_MEMORY_WINDOW_MAX = 40;
export const CONVERSATION_MEMORY_WINDOW_STEP = 20;

export const CONVERSATION_MEMORY_QUEUE = 'conversation-memory';

export enum ENUM_CONVERSATION_MEMORY_PROCESS {
    SUMMARIZE = 'summarize',
}

/** Most messages folded into the summary in one call. A conversation older
 *  than the summary itself (it ran long before memory shipped) folds in only
 *  its newest ones. */
export const CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES = 100;

export const CONVERSATION_MEMORY_MAX_ATTEMPTS = 3;
