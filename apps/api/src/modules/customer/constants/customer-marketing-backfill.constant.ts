/**
 * The 90-day marketing backfill (#500): reads a workspace's recent
 * conversations once, newest first, to fill the marketing labels.
 */
export const CUSTOMER_MARKETING_BACKFILL_QUEUE = 'customer-marketing-backfill';

export enum ENUM_CUSTOMER_MARKETING_BACKFILL_PROCESS {
    BATCH = 'batch',
}

/** How far back it reads. */
export const CUSTOMER_MARKETING_BACKFILL_DAYS = 90;

/** Conversations classified in parallel by one task. */
export const CUSTOMER_MARKETING_BACKFILL_BATCH_SIZE = 25;

/** It may spend at most this share of the tokens left when it starts (Jaden, 2026-11-11). */
export const CUSTOMER_MARKETING_BACKFILL_TOKEN_SHARE = 0.3;

/**
 * Quota units one conversation is assumed to cost before the run has
 * measured its own average. On the high side, so the first batch never
 * runs past the cap.
 */
export const CUSTOMER_MARKETING_BACKFILL_UNITS_PER_CONVERSATION = 8000;

/**
 * A run with no progress for this long lost its task chain (every retry of
 * a batch failed); starting it again re-queues it.
 */
export const CUSTOMER_MARKETING_BACKFILL_STALE_MS = 15 * 60 * 1000;
