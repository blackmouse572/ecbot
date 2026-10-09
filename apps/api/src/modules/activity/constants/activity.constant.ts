export const ACTIVITY_VIEW_CACHE_PREFIX = 'activity:view';

// The SPA polls conversation detail and messages every few seconds, so one
// VIEW per actor, workspace and record is kept per window.
export const ACTIVITY_VIEW_DEDUPE_TTL_MS = 10 * 60 * 1000;

export const ACTIVITY_USER_AGENT_MAX_LENGTH = 512;
