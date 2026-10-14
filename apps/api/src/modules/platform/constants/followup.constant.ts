export const FOLLOWUP_QUEUE = 'followup';

/** Cloud Task name prefix; the suffix is the `followups` row id. */
export const FOLLOWUP_TASK_PREFIX = 'followup-';

/** `outcome_reason` is varchar(255); error messages can be far longer. */
export const OUTCOME_REASON_MAX_LENGTH = 255;

/**
 * Hard cap on concurrent pending follow-ups per conversation. Without this a
 * prompt-injected bot can schedule unbounded proactive messages to a customer
 * (spam) and burn AI-generation quota when they all fire.
 */
export const MAX_PENDING_FOLLOWUPS_PER_CONVERSATION = 5;

/** A bot has no business scheduling further out than 30 days. */
export const FOLLOWUP_MAX_AHEAD_MINUTES = 43_200;

/** A wall-clock follow-up must be at least this far ahead to be accepted. */
export const FOLLOWUP_MIN_LEAD_MINUTES = 1;

export enum ENUM_FOLLOWUP_PROCESS {
    FIRE = 'fire',
}

export enum ENUM_FOLLOWUP_STATUS {
    SCHEDULED = 'SCHEDULED',
    COMPLETED = 'COMPLETED',
    SKIPPED = 'SKIPPED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

/** Why a fired followup produced no message — stored on `outcomeReason`. */
export enum ENUM_FOLLOWUP_SKIP_REASON {
    CONVERSATION_MISSING = 'conversation_missing',
    BOT_DISABLED = 'bot_disabled',
    CONVERSATION_RESOLVED = 'conversation_resolved',
    CHATBOT_MISSING = 'chatbot_missing',
    TOKEN_QUOTA_EXHAUSTED = 'token_quota_exhausted',
}

/**
 * Statuses a followup can still leave: it has not been delivered yet. FAILED is
 * in here because Cloud Tasks retries a 5xx — treating it as terminal would
 * make the retry short-circuit instead of trying the delivery again.
 */
export const PENDING_FOLLOWUP_STATUSES: ENUM_FOLLOWUP_STATUS[] = [
    ENUM_FOLLOWUP_STATUS.SCHEDULED,
    ENUM_FOLLOWUP_STATUS.FAILED,
];
