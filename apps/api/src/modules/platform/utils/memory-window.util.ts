import {
    CONVERSATION_MEMORY_WINDOW_MAX,
    CONVERSATION_MEMORY_WINDOW_STEP,
} from '../constants/conversation-memory.constant';

/**
 * How many of the `unsummarized` messages (oldest first) fall outside a
 * window of `max`: none up to the max, then whole steps, so the window holds
 * between `max - STEP` and `max` messages and its first message only moves
 * once per step.
 */
export function memoryWindowDrop(
    unsummarized: number,
    max = CONVERSATION_MEMORY_WINDOW_MAX
): number {
    if (unsummarized <= max) return 0;
    const keepMin = max - CONVERSATION_MEMORY_WINDOW_STEP;
    return (
        Math.floor((unsummarized - keepMin) / CONVERSATION_MEMORY_WINDOW_STEP) *
        CONVERSATION_MEMORY_WINDOW_STEP
    );
}
