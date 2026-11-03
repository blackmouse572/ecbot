/**
 * What one reply turn did. `failed` means the customer got nothing although
 * they should have (the stream broke, or no reply or fallback was sent);
 * `skipped` means there was nothing to answer (bot off, turn superseded).
 * `steeredMessageIds` are the customer's newer messages the turn took in, so
 * the burst buffer drops them instead of answering them again.
 */
export type ReplyOutcome =
    | { status: 'delivered'; steeredMessageIds?: string[] }
    | { status: 'skipped'; reason: string; steeredMessageIds?: string[] }
    | { status: 'failed'; reason: string; steeredMessageIds?: string[] };
