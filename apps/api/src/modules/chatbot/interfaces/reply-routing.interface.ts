export const REPLY_ROUTING = Symbol('REPLY_ROUTING');

/** OpenRouter's `provider.sort`: cheapest, fastest output, or quickest first token. */
export type ReplyProviderSort = 'price' | 'throughput' | 'latency';

/**
 * Reply routing seam. Absent in the public build: apps/ai routes as its
 * OPENROUTER_PROVIDER_SORT says (OpenRouter's own routing when unset). Ecbot
 * Cloud provides it to send paid plans to the fastest provider.
 */
export interface ReplyRouting {
    /** How to pick the provider for this workspace's replies; null keeps the default. */
    providerSort(workspaceId: string): Promise<ReplyProviderSort | null>;
}
