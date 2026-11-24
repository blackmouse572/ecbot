/**
 * Structured log event for an inbound customer message the bot never
 * answered. Feeds the `reply_missed` log-based metric in
 * `scripts/apply-monitoring.sh`; keep the two names in sync.
 */
export const REPLY_MISSED_EVENT = 'reply.missed' as const;

/** Redis claim key per message, so one miss alerts once. */
export const REPLY_MISSED_KEY_PREFIX = 'reply-missed';
export const REPLY_MISSED_KEY_TTL_SECONDS = 60 * 60;

/**
 * A turn can take minutes (tool roundtrips, typing indicator refreshes), so
 * the sweep waits before calling it missed. The lower bound also absorbs the
 * debounce window.
 */
export const REPLY_MISSED_MIN_AGE_SECONDS = 5 * 60;

/**
 * Only recent inbound rows are scanned, so the per-minute query stays small
 * and an old backlog never alerts.
 */
export const REPLY_MISSED_WINDOW_SECONDS = 30 * 60;

/** Bound one sweep: a pathological backlog must not stall the event loop. */
export const REPLY_MISSED_MAX_PER_RUN = 200;
