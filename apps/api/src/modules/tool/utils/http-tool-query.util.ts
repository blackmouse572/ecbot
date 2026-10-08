/** HTTP methods whose tool arguments travel in the query string, not a body. */
export const HTTP_TOOL_QUERY_METHODS = ['GET', 'DELETE'];

/** Sets one query parameter, replacing any value it had. */
export function setQueryParam(url: string, key: string, value: string): string {
    const parsed = parseUrl(url);
    if (!parsed) return url;
    parsed.searchParams.set(key, value);
    return parsed.toString();
}

/**
 * Null for a URL that cannot be parsed: the caller sends it unchanged, and
 * the request fails with the usual error result instead of throwing here.
 */
function parseUrl(url: string): URL | null {
    try {
        return new URL(url);
    } catch {
        return null;
    }
}

/**
 * Appends a tool call's arguments to `url` as query parameters (#232).
 * Objects and arrays are JSON-encoded; undefined and null are left out.
 *
 * A key the URL already has (a parameter fixed in the tool's URL, or the
 * API key) is never overridden: the agent's arguments can come from a
 * prompt-injected visitor, and many servers read the last duplicate.
 */
export function appendQueryArgs(
    url: string,
    args: Record<string, unknown>
): { url: string; skipped: string[] } {
    const parsed = parseUrl(url);
    if (!parsed) return { url, skipped: [] };
    const fixed = new Set(parsed.searchParams.keys());
    const skipped: string[] = [];
    for (const [key, value] of Object.entries(args ?? {})) {
        if (value === undefined || value === null) continue;
        if (fixed.has(key)) {
            skipped.push(key);
            continue;
        }
        parsed.searchParams.append(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
        );
    }
    return { url: parsed.toString(), skipped };
}
