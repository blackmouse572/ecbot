/**
 * Structured log event for an inbound customer message the bot never
 * answered. Feeds the `reply_missed` log-based metric in
 * `scripts/apply-monitoring.sh`; keep the two names in sync.
 */
export const REPLY_MISSED_EVENT = 'reply.missed' as const;

/**
 * Cloud Tasks queue for the delayed per-message check. An event-driven task,
 * not an in-process cron: production Postgres (Neon Free) suspends after five
 * idle minutes, so a minute cron would keep it awake (see
 * `test/common/database/cron-cadence.spec.ts`). The name doubles as the
 * callback route (`/api/v1/system/tasks/reply-missed`).
 */
export const REPLY_MISSED_QUEUE = 'reply-missed';

/** Cloud Task name prefix; the suffix is the inbound `messages` row id. */
export const REPLY_MISSED_TASK_PREFIX = 'reply-missed-';

export enum ENUM_REPLY_MISSED_PROCESS {
    CHECK = 'check',
}

/** Redis claim key per message, so one miss alerts once. */
export const REPLY_MISSED_KEY_PREFIX = 'reply-missed';
export const REPLY_MISSED_KEY_TTL_SECONDS = 60 * 60;

/**
 * Check this long after the inbound row was saved. A turn can take minutes
 * (tool roundtrips, typing indicator refreshes), so the delay also absorbs
 * the debounce window.
 */
export const REPLY_MISSED_DELAY_SECONDS = 5 * 60;
