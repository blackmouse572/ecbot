/**
 * Conversation memory: the recent messages apps/ai gets each Turn, plus a
 * rolling summary of everything older.
 *
 * The window holds every message the summary does not cover yet, up to
 * `CONVERSATION_MEMORY_WINDOW_CAP` below. Past
 * `CONVERSATION_MEMORY_WINDOW_MAX` the oldest ones, in whole
 * `CONVERSATION_MEMORY_WINDOW_STEP`s, are folded into the summary in the
 * background, and leave the window only once the summary covers them, so the
 * bot goes without them only when the summary lags past the cap. The window's first message thus moves once per
 * step, and between two moves the prompt only grows at its end, so the
 * provider's prompt cache keeps hitting.
 */
export const CONVERSATION_MEMORY_WINDOW_MAX = 40;
export const CONVERSATION_MEMORY_WINDOW_STEP = 20;

/** The most messages the window holds while the summary lags behind (a job
 *  failed, the queue is slow, or staff wrote a long stretch with the bot off),
 *  cut in the same steps so the cache still hits. */
export const CONVERSATION_MEMORY_WINDOW_CAP = 80;

export const CONVERSATION_MEMORY_QUEUE = 'conversation-memory';

export enum ENUM_CONVERSATION_MEMORY_PROCESS {
    SUMMARIZE = 'summarize',
}

/** Most messages folded into the summary in one call. A longer range is folded
 *  from its oldest end, and the job queues the next one for the rest. */
export const CONVERSATION_MEMORY_SUMMARIZE_MAX_MESSAGES = 100;

export const CONVERSATION_MEMORY_MAX_ATTEMPTS = 3;
