const DOCS_BASE_URL = (
  import.meta.env.VITE_DOCS_URL || "https://ecbot.dev"
).replace(/\/+$/, "");

/**
 * Absolute link to a docs page in the reader's language, e.g.
 * `docsUrl("legal/privacy-policy", "vi")` -> `https://ecbot.dev/vi/docs/legal/privacy-policy`.
 * Absolute so it also works inside the website widget iframe.
 */
export function docsUrl(path: string, language: string | undefined): string {
  const lang = language?.startsWith("vi") ? "vi" : "en";
  return `${DOCS_BASE_URL}/${lang}/docs/${path}`;
}
