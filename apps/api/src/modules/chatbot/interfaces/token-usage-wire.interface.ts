/**
 * Token counts for one LLM turn, as reported by apps/ai.
 *
 * apps/ai emits these on the `message-metadata` frame of the UI message stream
 * (`apps/ai/.../modules/chat/stream_pipeline.py`) — snake_case on the wire,
 * camelCase once parsed here.
 */
export interface TokenUsageDelta {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    /** Part of `inputTokens` read from the provider's prompt cache. */
    cacheReadTokens?: number;
    /** Part of `inputTokens` written to the provider's prompt cache. */
    cacheWriteTokens?: number;
}

/** The raw `messageMetadata.usage` shape apps/ai puts on the wire. */
export interface WireTokenUsage {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    cache_read_tokens?: number;
    cache_write_tokens?: number;
}

/**
 * Parse a `message-metadata` frame's usage payload. Returns null when the frame
 * carries no usage or nothing numeric — a turn we cannot bill is not a turn
 * billed as zero.
 */
export function parseWireTokenUsage(raw: unknown): TokenUsageDelta | null {
    if (!raw || typeof raw !== 'object') return null;
    const usage = raw as WireTokenUsage;
    const inputTokens = Number(usage.input_tokens ?? 0);
    const outputTokens = Number(usage.output_tokens ?? 0);
    const totalTokens = Number(usage.total_tokens ?? 0);
    if (
        !Number.isFinite(inputTokens) ||
        !Number.isFinite(outputTokens) ||
        !Number.isFinite(totalTokens)
    ) {
        return null;
    }
    // A negative count is nonsense from the wire, and it does real damage:
    // `TokenUsageService.record` writes the ledger row before `applyUsage`
    // rejects non-positive totals, so the row survives and drags down every
    // SUM behind the caps, the trend and the breakdowns. An unbillable turn
    // must not become a negatively-billed one.
    if (inputTokens < 0 || outputTokens < 0 || totalTokens < 0) {
        return null;
    }
    if (inputTokens === 0 && outputTokens === 0 && totalTokens === 0) {
        return null;
    }

    const cacheReadTokens = cacheCount(usage.cache_read_tokens);
    const cacheWriteTokens = cacheCount(usage.cache_write_tokens);
    // Cache counts are parts of the input. If they claim more than it, they
    // are wrong, and billing them at the cheaper cache rate would undercharge.
    const cacheFits = cacheReadTokens + cacheWriteTokens <= inputTokens;

    return {
        inputTokens,
        outputTokens,
        // Some providers report only input/output; derive the total ourselves.
        totalTokens: totalTokens || inputTokens + outputTokens,
        ...(cacheFits && cacheReadTokens > 0 && { cacheReadTokens }),
        ...(cacheFits && cacheWriteTokens > 0 && { cacheWriteTokens }),
    };
}

/** A cache count off the wire; anything not a non-negative number is 0. */
function cacheCount(raw: unknown): number {
    const value = Number(raw ?? 0);

    return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Two usages of one Turn added up; undefined when neither was reported. */
export function addTokenUsage(
    a?: TokenUsageDelta | null,
    b?: TokenUsageDelta | null
): TokenUsageDelta | undefined {
    if (!a || !b) return a ?? b ?? undefined;

    const cacheReadTokens = (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0);

    const cacheWriteTokens =
        (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0);

    return {
        inputTokens: a.inputTokens + b.inputTokens,
        outputTokens: a.outputTokens + b.outputTokens,
        totalTokens: a.totalTokens + b.totalTokens,
        ...(cacheReadTokens > 0 && { cacheReadTokens }),
        ...(cacheWriteTokens > 0 && { cacheWriteTokens }),
    };
}
