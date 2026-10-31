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

/**
 * Stored on a website item whose read text went over the plan's knowledge
 * storage; what was read is removed. apps/app matches this exact string.
 */
export const RAG_INGEST_STORAGE_FULL_ERROR =
    "This website has more text than your plan's knowledge storage has room for. Delete some knowledge or upgrade your plan, then process it again.";

/**
 * Pages one website item may read: the owner picks up to this many, and
 * apps/ai follows same-site links until it has them.
 */
export const KNOWLEDGE_URL_MAX_PAGES = 50;

/**
 * Reading a website page costs us a scraper call, so each page read is
 * charged to the workspace's plan as this many tokens (Ecbot Cloud only).
 * Each stored page is about one Firecrawl credit, about $0.001 on the Standard
 * plan; at the plan unit of $0.15 per million tokens that is about 7,000 tokens.
 * A lower bound: pages dropped as empty or unsafe are billed by Firecrawl but
 * not counted in `pages_crawled`.
 */
export const KNOWLEDGE_CRAWL_TOKENS_PER_PAGE = 7000;

/** Crawling up to `KNOWLEDGE_URL_MAX_PAGES` pages takes minutes, not seconds. */
export const RAG_INGEST_URL_HTTP_TIMEOUT_MS = 300 * 1000;
