/* Serves the static export. Cloudflare routes send /en/docs*, /vi/docs*,
 * /docs* and /_docs/* on ecbot.dev here; everything else stays with the
 * marketing site. A bare /docs link gets the same locale negotiation the
 * marketing worker uses: NEXT_LOCALE cookie, then Accept-Language, then en. */
const LOCALES = ["en", "vi"];
const DEFAULT_LOCALE = "en";
const COOKIE_NAME = "NEXT_LOCALE";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// Static assets get their MIME type from the extension; these need fixing.
const TYPES: [RegExp, string][] = [
  [/\.md$/, "text/markdown; charset=utf-8"],
  [/\.txt$/, "text/plain; charset=utf-8"],
];

function withContentType(pathname: string, response: Response) {
  const type = TYPES.find(([pattern]) => pattern.test(pathname))?.[1];
  if (!type || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set("Content-Type", type);
  return new Response(response.body, { status: response.status, headers });
}

function negotiateLocale(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/NEXT_LOCALE=(\w+)/)?.[1];
  if (cookie && LOCALES.includes(cookie)) return cookie;
  const accepted = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => part.split(";")[0]?.trim().split("-")[0]);
  return accepted.find((l) => l && LOCALES.includes(l)) ?? DEFAULT_LOCALE;
}

/** A /docs page link without a locale; files (with an extension) pass through. */
function isUnprefixedPage(pathname: string) {
  return /^\/docs(\/|$)/.test(pathname) && !/\.[^/]+$/.test(pathname);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (isUnprefixedPage(url.pathname)) {
      const locale = negotiateLocale(request);
      url.pathname = `/${locale}${url.pathname.replace(/\/$/, "")}`;
      return new Response(null, {
        status: 307,
        headers: {
          location: url.toString(),
          "set-cookie": `${COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
        },
      });
    }

    return withContentType(url.pathname, await env.ASSETS.fetch(request));
  },
};
