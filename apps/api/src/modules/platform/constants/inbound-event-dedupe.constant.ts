/**
 * Inbound event dedupe. The single shared seam — checked at the top of
 * MessageProcessorService.process(), regardless of which ingress path (edge
 * Worker or direct-to-api) delivered the event — that turns a platform
 * redelivery of the same message into a no-op instead of a second Turn.
 */
export const INBOUND_EVENT_DEDUPE_KEY_PREFIX = 'inbound-event-dedupe';

/** TTL on the claim key; matches the BullMQ inbound-job dedup retention. */
export const INBOUND_EVENT_DEDUPE_TTL_SECONDS = 24 * 60 * 60;
