export const COUNTRY_DEFAULT_AVAILABLE_SEARCH = [
    'name',
    'alpha2Code',
    'phoneCode',
];

// Countries change only when re-seeded at deploy. The Redis cache outlives a
// deploy, so a re-seed reaches cached pages within this TTL. Kept short
// because the key is the client's URL (any page/search/sort mints an entry).
export const COUNTRY_LIST_CACHE_TTL_MS = 60 * 60 * 1000;
