/**
 * Each instance remembers an active login session for this long instead of
 * asking Redis on every request. A revoke on another instance takes up to this
 * long to reach this one, the same delay the user guard already allows for a
 * blocked user (USER_GUARD_CACHE_TTL_MS).
 */
export const SESSION_LOGIN_CACHE_TTL_MS = 30_000;
export const SESSION_LOGIN_CACHE_MAX_ENTRIES = 5_000;

// Minimum gap between lastActiveAt writes for a session on one instance.
export const SESSION_ACTIVE_THROTTLE_MS = 60_000;
