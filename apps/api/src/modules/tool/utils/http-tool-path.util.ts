/** `{name}` placeholders in an HTTP tool URL, filled from the call's arguments. */
const PLACEHOLDER = /\{([A-Za-z_][\w-]*)\}/g;

/** Splits a URL into origin, path and the ?query#fragment that follows. */
const URL_PARTS = /^([a-z][a-z\d+.-]*:\/\/[^/?#]*)([^?#]*)(.*)$/is;

/**
 * Fills each `{name}` in the URL's path with the URL-encoded argument of
 * that name (e.g. `/products/{id}` with `{ id: 1 }` becomes `/products/1`).
 * Only the path is filled, never the origin, so an argument cannot send the
 * tool's credential to another host. Used arguments are left out of `rest`,
 * so they are not also sent in the query or body. A missing argument, or
 * `.`/`..` (which would climb the path), is an error.
 */
export function fillPathArgs(
    url: string,
    args: Record<string, unknown>
): { url: string; rest: Record<string, unknown>; error?: string } {
    const parts = URL_PARTS.exec(url);
    if (!parts) return { url, rest: { ...(args ?? {}) } };
    const [, origin, path, tail] = parts;
    const used = new Set<string>();
    let error: string | undefined;
    const filled = path.replace(PLACEHOLDER, (match, name: string) => {
        const value = args?.[name];
        used.add(name);
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
    const rest = { ...(args ?? {}) };
    for (const name of used) delete rest[name];
    return { url: `${origin}${filled}${tail}`, rest, error };
}
