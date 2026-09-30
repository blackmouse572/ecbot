/**
 * What one reply turn did. `failed` means the customer got nothing although
 * they should have (the stream broke, or no reply or fallback was sent);
 * `skipped` means there was nothing to answer (bot off, turn superseded).
 */
export type ReplyOutcome =
    | { status: 'delivered' }
    | { status: 'skipped'; reason: string }
    | { status: 'failed'; reason: string };
