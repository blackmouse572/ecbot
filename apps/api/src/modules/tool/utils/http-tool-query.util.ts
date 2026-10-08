/** HTTP methods whose tool arguments travel in the query string, not a body. */
export const HTTP_TOOL_QUERY_METHODS = ['GET', 'DELETE'];

/**
 * How servers tend to read a key: case-insensitively, and with `a[]` or
 * `a[0]` merged into `a` (qs, PHP, Rails). Two keys with the same form
 * collide.
 */
function keyForm(key: string): string {
    return key.toLowerCase().replace(/\[[^\]]*\]$/, '');
}

/** The URL's query keys in their colliding form. */
function existingKeys(url: string): Set<string> {
    try {
        return new Set([...new URL(url).searchParams.keys()].map(keyForm));
    } catch {
        return new Set();
    }
}

/**
 * Appends `pairs` to the query as text, before any #fragment, so the URL's
 * own parameters reach the server exactly as written (no re-encoding).
 */
function appendPairs(url: string, pairs: [string, string][]): string {
    if (!pairs.length) return url;
    const hashAt = url.indexOf('#');
    const base = hashAt === -1 ? url : url.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : url.slice(hashAt);
    const sep = !base.includes('?')
        ? '?'
        : base.endsWith('?') || base.endsWith('&')
          ? ''
          : '&';
    return `${base}${sep}${new URLSearchParams(pairs).toString()}${hash}`;
}

/**
 * Sets one query parameter (the query API key). Appended when the URL does
 * not have it; when the owner also wrote it into the URL, it is replaced.
 */
export function setQueryParam(url: string, key: string, value: string): string {
    if (!existingKeys(url).has(keyForm(key))) {
        return appendPairs(url, [[key, value]]);
    }
    try {
        const parsed = new URL(url);
        for (const k of [...parsed.searchParams.keys()]) {
            if (keyForm(k) === keyForm(key)) parsed.searchParams.delete(k);
        }
        parsed.searchParams.set(key, value);
        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Appends a tool call's arguments to `url` as query parameters (#232).
 * Objects and arrays are JSON-encoded; undefined and null are left out.
 *
 * An argument whose key collides with one the URL already has (a parameter
 * fixed in the tool's URL, or the API key; see keyForm) is dropped: the
 * agent's arguments can come from a prompt-injected visitor, and many
 * servers read the last duplicate.
 */
export function appendQueryArgs(
    url: string,
    args: Record<string, unknown>
): { url: string; skipped: string[] } {
    const fixed = existingKeys(url);
    const skipped: string[] = [];
    const pairs: [string, string][] = [];
    for (const [key, value] of Object.entries(args ?? {})) {
        if (value === undefined || value === null) continue;
        if (fixed.has(keyForm(key))) {
            skipped.push(key);
            continue;
        }
        pairs.push([
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value),
        ]);
    }
    return { url: appendPairs(url, pairs), skipped };
}
