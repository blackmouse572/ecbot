import { ENUM_WORKER_QUEUES } from '@app/worker/enums/worker.enum';

/**
 * The Inbound Inbox (ADR-0007). Inbound platform webhooks are made durable by
 * enqueueing the raw event here BEFORE the webhook ACK — the BullMQ job is the
 * durable record, replacing the rejected fire-and-forget intake and the
 * Postgres `inbound_events` table ADR-0002 had chosen.
 */
export const INBOUND_EVENT_QUEUE = ENUM_WORKER_QUEUES.INBOUND_EVENT_QUEUE;

export enum ENUM_INBOUND_EVENT_PROCESS {
    INGEST = 'ingest',
}

/**
 * Completed jobs are kept this long so their deterministic jobId
 * (`platform-externalMessageId`) deduplicates both platform redeliveries and
 * reconciliation backfill. 26h = 25h reconciliation lookback + 1h buffer;
 * this also covers Messenger's ~24h webhook retry window.
 * This retention IS the dedupe — there is no separate transient Redis-key dedupe.
 */
export const INBOUND_EVENT_DEDUP_AGE_SECONDS = 26 * 60 * 60;

export const INBOUND_EVENT_MAX_ATTEMPTS = 3;
