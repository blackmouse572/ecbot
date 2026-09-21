export const RAG_INGEST_QUEUE = 'knowledge-ingest';

/** Retained Sentry tag for continuity with the former BullMQ processor. */
export const RAG_INGEST_SENTRY_QUEUE = 'RAG_INGEST_QUEUE';

export enum ENUM_RAG_INGEST_PROCESS {
    INGEST = 'ingest',
    REINDEX_LINKS = 'reindex-links',
    DELETE = 'delete',
}

/** Cloud Tasks delivery attempts before the item is marked FAILED. */
export const RAG_INGEST_MAX_ATTEMPTS = 3;

/** HTTP timeout for apps/api -> apps/ai ingest (embedding can be slow). */
export const RAG_INGEST_HTTP_TIMEOUT_MS = 120 * 1000;
