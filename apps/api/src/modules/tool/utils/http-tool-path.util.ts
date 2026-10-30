/** `{name}` placeholders in an HTTP tool URL, filled from the call's arguments. */
const PLACEHOLDER = /\{([A-Za-z_][\w-]*)\}/g;

/**
 * Fills each `{name}` in `url` with the URL-encoded argument of that name
 * (e.g. `/products/{id}` with `{ id: 1 }` becomes `/products/1`). Used
 * arguments are left out of `rest`, so they are not also sent in the query
 * or body. A missing argument, or `.`/`..` (which would climb the path), is
 * an error.
 */
export function fillPathArgs(
    url: string,
    args: Record<string, unknown>
): { url: string; rest: Record<string, unknown>; error?: string } {
    const rest = { ...(args ?? {}) };
    let error: string | undefined;
    const filled = url.replace(PLACEHOLDER, (match, name: string) => {
        const value = rest[name];
        delete rest[name];
        if (value === undefined || value === null || value === '') {
            error ??= `Missing argument "${name}" for the URL path`;
            return match;
        }
        const text =
            typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (text === '.' || text === '..') {
            error ??= `Argument "${name}" cannot be "${text}"`;
            return match;
        }
        return encodeURIComponent(text);
    });
    return { url: filled, rest, error };
}
