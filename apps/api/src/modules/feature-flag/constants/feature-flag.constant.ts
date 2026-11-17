export const FEATURE_FLAG_META_KEY = 'FeatureFlagMetaKey';

/** A flag change at the provider reaches the API within this long. */
export const FEATURE_FLAG_FRESH_MS = 60_000;
/** Through a provider outage the last answer holds this long, then the flag reads as off. */
export const FEATURE_FLAG_STALE_MS = 10 * 60_000;
/** Flag and workspace pairs remembered before the cache starts over. */
export const FEATURE_FLAG_MAX_CACHED = 20_000;
