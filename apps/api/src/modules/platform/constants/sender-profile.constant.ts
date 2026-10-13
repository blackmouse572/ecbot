/** How long a fetched sender name/avatar is trusted before it is refetched. */
export const SENDER_PROFILE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How long to wait before looking again after a lookup found no name or
 * avatar. Short, so a missing profile is retried soon, but long enough that a
 * burst of imported messages can't fan out into a burst of Graph calls.
 */
export const SENDER_PROFILE_EMPTY_RETRY_MS = 15 * 60 * 1000;
