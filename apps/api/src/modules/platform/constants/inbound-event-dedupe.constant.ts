/**
 * Inbound event dedupe. The single shared seam — checked at the top of
 * MessageProcessorService.process(), regardless of which ingress path (edge
 * Worker or direct-to-api) delivered the event — that turns a platform
 * redelivery of the same message into a no-op instead of a second Turn.
 */
export const INBOUND_EVENT_DEDUPE_KEY_PREFIX = 'inbound-event-dedupe';

/** Marks a pair InboundInboxService already turned into a Cloud Task. */
export const INBOUND_EVENT_ENQUEUED_KEY_PREFIX = 'inbound-event-enqueued';

/**
 * TTL on the claim key. 26h = 25h reconciliation lookback + 1h buffer, which
 * also covers Messenger's ~24h webhook retry window. Cloud Tasks only rejects
 * a reused task name for ~1h, so this claim is the long-window dedupe.
 */
export const INBOUND_EVENT_DEDUPE_TTL_SECONDS = 26 * 60 * 60;
