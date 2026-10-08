/** HTTP methods whose tool arguments travel in the query string, not a body. */
export const HTTP_TOOL_QUERY_METHODS = ['GET', 'DELETE'];

/**
 * Appends a tool call's arguments to `url` as query parameters (#232).
 * Objects and arrays are JSON-encoded; undefined and null are left out.
 */
export function appendQueryArgs(
    url: string,
    args: Record<string, unknown>
): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(args ?? {})) {
        if (value === undefined || value === null) continue;
        params.append(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
        );
    }
    const query = params.toString();
    if (!query) return url;
    return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}
