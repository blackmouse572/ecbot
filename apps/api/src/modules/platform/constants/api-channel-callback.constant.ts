/**
 * Outbound delivery for the API channel. Unlike every other platform, eccho is
 * the caller here: a bot reply is POSTed to the third party's own endpoint. The
 * first attempt runs inline in `doSend`; a failure retries in-process with
 * exponential backoff instead of blocking the reply pipeline (no queue — a
 * restart drops any retry still in flight, acceptable for a best-effort
 * third-party callback).
 */
export const API_CHANNEL_CALLBACK_MAX_ATTEMPTS = 5;
export const API_CHANNEL_CALLBACK_BACKOFF_MS = 5000;

/** Signature header the third party verifies the payload with. */
export const API_CHANNEL_SIGNATURE_HEADER = 'x-eccho-signature';

/** Timestamp header — signed alongside the body so a capture can't be replayed. */
export const API_CHANNEL_TIMESTAMP_HEADER = 'x-eccho-timestamp';

export const API_CHANNEL_CALLBACK_TIMEOUT_MS = 10_000;
