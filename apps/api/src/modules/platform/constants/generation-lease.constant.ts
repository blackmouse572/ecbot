/**
 * Generation lease. A per-conversation monotonic epoch: every
 * inbound message bumps it, and a reply generation only sends if the epoch it
 * captured at the start is still current. A newer message therefore supersedes
 * an in-flight generation, but only until it runs a tool or sends a part: after
 * that the turn finishes, and the newer message is steered into it or gets a
 * follow-up turn (MessageDebounceService, the edge ConversationDebounceDO).
 */
export const GENERATION_LEASE_KEY_PREFIX = 'gen-lease';

/** TTL on the epoch key; comfortably longer than any single generation. */
export const GENERATION_LEASE_TTL_SECONDS = 60 * 60;
