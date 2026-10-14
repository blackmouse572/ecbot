import {
    CONVERSATION_MEMORY_WINDOW_MAX,
    CONVERSATION_MEMORY_WINDOW_STEP,
} from '../constants/conversation-memory.constant';

/**
 * How many of the `unsummarized` messages (oldest first) fall out of the
 * window: none up to the max, then whole steps, so the window holds between
 * `MAX - STEP` and `MAX` messages and its first message only moves once per
 * step.
 */
export function memoryWindowDrop(unsummarized: number): number {
    if (unsummarized <= CONVERSATION_MEMORY_WINDOW_MAX) return 0;
    const keepMin =
        CONVERSATION_MEMORY_WINDOW_MAX - CONVERSATION_MEMORY_WINDOW_STEP;
    return (
        Math.floor((unsummarized - keepMin) / CONVERSATION_MEMORY_WINDOW_STEP) *
        CONVERSATION_MEMORY_WINDOW_STEP
    );
}
