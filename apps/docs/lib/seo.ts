/* SEO + answer-engine helpers. The @id scheme matches the marketing site
 * (eccho-ee apps/web lib/aeo.ts), so docs pages join the same entity graph:
 * one Organization, one WebSite, each docs page a TechArticle inside it. */
import { i18n } from "./i18n";
import { SITE_URL, pageUrl } from "./urls";

export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;
export const TITLE_SUFFIX = " | Ecbot Docs";

export type FaqItem = { q: string; a: string };

const IETF: Record<string, string> = { en: "en-US", vi: "vi-VN" };
const OG_LOCALE: Record<string, string> = { en: "en_US", vi: "vi_VN" };

export function ietfLocale(lang: string) {
  return IETF[lang] ?? IETF[i18n.defaultLanguage]!;
}

export function ogLocale(lang: string) {
  return OG_LOCALE[lang] ?? OG_LOCALE[i18n.defaultLanguage]!;
}

/** hreflang map for the locales a page exists in. x-default only when the
 * default locale exists, so it never points at a missing page. */
export function alternateLanguages(slugs: string[], locales: readonly string[]) {
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((l) => [l, pageUrl(l, slugs)]),
  );
  if (locales.includes(i18n.defaultLanguage))
    languages["x-default"] = pageUrl(i18n.defaultLanguage, slugs);
  return languages;
}

export function techArticleNode({
  url,
  lang,
  title,
  description,
  image,
  modified,
}: {
  url: string;
  lang: string;
  title: string;
  description: string;
  image: string;
  modified?: Date;
}) {
  return {
    "@type": "TechArticle",
    "@id": `${url}#article`,
    url,
    mainEntityOfPage: url,
    headline: title,
    description,
    image,
    inLanguage: ietfLocale(lang),
    ...(modified ? { dateModified: modified.toISOString() } : {}),
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": SITE_ID },
    breadcrumb: { "@id": `${url}#breadcrumb` },
  };
}

export function breadcrumbNode(url: string, trail: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function faqNode(url: string, items: FaqItem[]) {
  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    isPartOf: { "@id": SITE_ID },
    mainEntity: items.map((item, i) => ({
      "@type": "Question",
      "@id": `${url}#faq-${i + 1}`,
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function graph(nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** JSON for a <script> tag. Escaping "<" keeps author text such as
 * "</script>" from closing the tag early. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
