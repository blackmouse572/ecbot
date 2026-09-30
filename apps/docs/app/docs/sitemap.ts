import type { MetadataRoute } from "next";
import { alternateLanguages } from "@/lib/seo";
import { pageLocales, source } from "@/lib/source";
import { pageUrl } from "@/lib/urls";

export const dynamic = "force-static";

// Served at /docs/sitemap.xml; the marketing site's robots.txt lists it.
export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => {
    const locales = pageLocales(page.slugs);
    return {
      url: pageUrl(page.locale ?? "en", page.slugs),
      lastModified: page.data.lastModified,
      changeFrequency: "weekly",
      priority: page.slugs.length ? 0.7 : 0.9,
      alternates: { languages: alternateLanguages(page.slugs, locales) },
    };
  });
}
