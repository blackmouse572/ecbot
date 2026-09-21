/**
 * Constants for the analytical Customer-tag classifier (see #170).
 *
 * The classifier runs at the "end" of a conversation — either when its status
 * flips to RESOLVED, or after 30 minutes of inbound silence — and updates the
 * non-handoff Customer tags + Customer.profileSummary. Tags whose
 * `triggersHandoff = true` are NEVER touched by this job; those belong to the
 * agent's mid-turn responsibility (#168).
 */

export const CUSTOMER_TAG_CLASSIFIER_QUEUE = 'customer-tag-classifier';

/** Retained Sentry tag for continuity with the former BullMQ processor. */
export const CUSTOMER_TAG_CLASSIFIER_SENTRY_QUEUE =
    'CUSTOMER_TAG_CLASSIFIER_QUEUE';

export enum ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS {
    CLASSIFY = 'classify',
}

/**
 * Debounce window after the most recent inbound message. If no newer message
 * arrives within this window the classifier fires for the conversation.
 */
export const CUSTOMER_TAG_CLASSIFIER_DEBOUNCE_MS = 30 * 60 * 1000;

/**
 * Number of Cloud Tasks delivery attempts before the final failure is sent to
 * Sentry.
 */
export const CUSTOMER_TAG_CLASSIFIER_MAX_ATTEMPTS = 3;

/**
 * How many of the most recent messages on a conversation we ship to the
 * classifier. Bounded to keep prompt + cost predictable.
 */
export const CUSTOMER_TAG_CLASSIFIER_MESSAGE_WINDOW = 50;

/**
 * Timeout for the HTTP call from apps/api → apps/ai. The classifier endpoint
 * is a single LLM call with structured output, so 30s is generous.
 */
export const CUSTOMER_TAG_CLASSIFIER_HTTP_TIMEOUT_MS = 30 * 1000;
