import { llms, loader } from "fumadocs-core/source";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";
import { i18n } from "./i18n";
import { absoluteLinks, screenshotsToMarkdown } from "./markdown";
import { faqSchema } from "./schema";
import { docsRoute, pagePath } from "./urls";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema.extend({
      description: z.string(),
      faq: faqSchema.default([]),
      // Reachable by URL, but kept out of search, the sitemap and llms-full.txt.
      noindex: z.boolean().default(false),
    }),
    lastModified: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

export const source = loader({
  i18n,
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  // Locale goes first (/en/docs/...) to match the marketing site's URLs.
  url: (slugs, locale) => pagePath(locale ?? i18n.defaultLanguage, slugs),
});

export type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

export const docsLlms = llms(source, {
  renderPage: async (page) =>
    absoluteLinks(`# ${page.data.title}

URL: ${page.url}

${page.data.description}

${screenshotsToMarkdown(await page.data.getText("processed"), page.locale ?? i18n.defaultLanguage)}${renderFaq(page.data.faq)}`),
});

function renderFaq(faq: { q: string; a: string }[]) {
  if (!faq.length) return "";
  return `\n\n## FAQ\n\n${faq.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}\n`;
}

/** Pages that search engines and AI assistants should see. */
export function indexedPages(lang?: string) {
  return source.getPages(lang).filter((page) => !page.data.noindex);
}

/** Locales this page exists in, for hreflang. */
export function pageLocales(slugs: string[]) {
  return i18n.languages.filter((lang) => source.getPage(slugs, lang));
}
