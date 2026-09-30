/* Every URL the docs publish, in one place. Pages sit under the locale prefix
 * the marketing site uses (/en/docs, /vi/docs); machine-readable files sit
 * under /docs so a single Cloudflare route covers them. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecbot.dev";

export const docsRoute = "/docs";
export const searchIndexUrl = "/docs/search.json";
export const repoUrl = "https://github.com/blackmouse572/ecbot";

type PageRef = { slugs: string[]; locale?: string };

export function pagePath(lang: string, slugs: string[]) {
  return `/${lang}${docsRoute}${slugs.length ? `/${slugs.join("/")}` : ""}`;
}

export function pageUrl(lang: string, slugs: string[]) {
  return `${SITE_URL}${pagePath(lang, slugs)}`;
}

/** Route segments for /docs/md/<lang>/<...slug>.md; the index page is "index.md". */
export function markdownSegments(slugs: string[]) {
  if (!slugs.length) return ["index.md"];
  return [...slugs.slice(0, -1), `${slugs.at(-1)}.md`];
}

export function slugsFromMarkdownSegments(segments: string[]) {
  const last = segments.at(-1)?.replace(/\.md$/, "");
  if (segments.length === 1 && last === "index") return [];
  return [...segments.slice(0, -1), last ?? ""];
}

export function markdownPath(page: PageRef) {
  return `${docsRoute}/md/${page.locale}/${markdownSegments(page.slugs).join("/")}`;
}

export function ogImagePath(page: PageRef) {
  return `${docsRoute}/og/${page.locale}/${[...page.slugs, "image.png"].join("/")}`;
}
