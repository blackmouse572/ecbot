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

/**
 * Media ingest can read a PDF's picture pages with the vision model (a
 * 30-page photo menu took up to 80s); still under Cloud Tasks' 10 minute
 * dispatch deadline.
 */
export const RAG_INGEST_MEDIA_HTTP_TIMEOUT_MS = 300 * 1000;

/** What failed for a knowledge item; picks the notification the owner gets. */
export enum ENUM_KNOWLEDGE_FAILURE_KIND {
    INGEST = 'ingest',
    LINK_SYNC = 'link_sync',
}

/**
 * Stored on an item whose ingest the usage meter refused (#250). apps/app
 * matches this exact string to translate it, like apps/ai's errors.
 */
export const RAG_INGEST_NO_TOKENS_ERROR =
    'Your workspace has no AI tokens left. Top up or renew your plan, then process this item again.';
