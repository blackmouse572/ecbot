// apps/api/src/modules/chatbot/utils/chat-stream-error.util.ts

/**
 * Errors that are safe to surface verbatim (well, as a fixed safe message) to
 * the operator preview. The raw provider error text — which can leak billing
 * details, URLs, user ids and provider internals — must never reach the client.
 * Anything not whitelisted becomes an empty string, so the frontend falls back
 * to its generic i18n error message.
 */
const WHITELISTED_ERROR_MESSAGES: Record<number, string> = {
    401: 'AI service authentication failed. Please contact your workspace owner.',
    429: 'The AI service is busy. Please try again in a moment.',
    500: 'The AI service is temporarily unavailable. Please try again later.',
};

const STATUS_CODE_RE = /Error code[: ]+(\d{3})/;

function extractStatusCode(raw: string): number | null {
    const match = raw.match(STATUS_CODE_RE);
    if (!match) return null;
    const code = Number(match[1]);
    return Number.isInteger(code) ? code : null;
}

/**
 * Maps a raw AI stream error text to a safe client-facing message.
 *
 * The provider error arrives wrapped as `[agent error: ...]` (see
 * `apps/ai/modules/chat/stream_pipeline.py`). We classify it by HTTP status
 * code — from the `Error code: NNN` fragment — and return a fixed safe message
 * for the whitelisted codes; everything else (e.g. a 402 credits error) yields
 * an empty string.
 */
export function safeErrorText(raw: string): string {
    const status = extractStatusCode(raw);
    if (status == null) return '';
    return WHITELISTED_ERROR_MESSAGES[status] ?? '';
}
