export const API_KEY_X_TYPE_META_KEY = 'ApiKeyXTypeMetaKey';

/**
 * A validated x-api-key is remembered per instance for this long, so the guard
 * does not query the database on every request. Deactivating or rotating a key
 * takes up to this long to reach every instance.
 */
export const API_KEY_CACHE_TTL_MS = 60_000;
export const API_KEY_CACHE_MAX_ENTRIES = 1_000;
