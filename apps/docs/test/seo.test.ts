import { describe, expect, it } from "vitest";
import {
  alternateLanguages,
  breadcrumbNode,
  faqNode,
  graph,
  ORG_ID,
  serializeJsonLd,
  SITE_ID,
  techArticleNode,
} from "../lib/seo";
import {
  markdownSegments,
  pageUrl,
  slugsFromMarkdownSegments,
} from "../lib/urls";

describe("urls", () => {
  it("puts the locale before /docs", () => {
    expect(pageUrl("vi", ["channels"])).toBe("https://ecbot.dev/vi/docs/channels");
    expect(pageUrl("en", [])).toBe("https://ecbot.dev/en/docs");
  });

  it("round-trips markdown segments, including the index page", () => {
    for (const slugs of [[], ["channels"], ["guides", "telegram"]]) {
      expect(slugsFromMarkdownSegments(markdownSegments(slugs))).toEqual(slugs);
    }
    expect(markdownSegments([])).toEqual(["index.md"]);
  });
});

describe("alternateLanguages", () => {
  it("lists each locale and points x-default at English", () => {
    expect(alternateLanguages(["channels"], ["en", "vi"])).toEqual({
      en: "https://ecbot.dev/en/docs/channels",
      vi: "https://ecbot.dev/vi/docs/channels",
      "x-default": "https://ecbot.dev/en/docs/channels",
    });
  });

  it("omits x-default when the English page is missing", () => {
    expect(alternateLanguages(["x"], ["vi"])).toEqual({
      vi: "https://ecbot.dev/vi/docs/x",
    });
  });
});

describe("JSON-LD", () => {
  const url = "https://ecbot.dev/en/docs/channels";

  it("links the article to the marketing site's organization and website", () => {
    const node = techArticleNode({
      url,
      lang: "vi",
      title: "Channels",
      description: "d",
      image: `${url}/og.png`,
      modified: new Date("2026-09-29T00:00:00Z"),
    });
    expect(node).toMatchObject({
      "@type": "TechArticle",
      "@id": `${url}#article`,
      inLanguage: "vi-VN",
      dateModified: "2026-09-29T00:00:00.000Z",
      publisher: { "@id": ORG_ID },
      isPartOf: { "@id": SITE_ID },
      breadcrumb: { "@id": `${url}#breadcrumb` },
    });
    expect(ORG_ID).toBe("https://ecbot.dev/#organization");
  });

  it("builds breadcrumb and FAQ nodes", () => {
    const g = graph([
      breadcrumbNode(url, [{ name: "Docs", url: "https://ecbot.dev/en/docs" }]),
      faqNode(url, [{ q: "Q?", a: "A." }]),
    ]);
    expect(g["@context"]).toBe("https://schema.org");
    expect(g["@graph"][0]).toMatchObject({
      itemListElement: [{ position: 1, name: "Docs" }],
    });
    expect(g["@graph"][1]).toMatchObject({
      mainEntity: [{ name: "Q?", acceptedAnswer: { text: "A." } }],
    });
  });

  it("escapes < so content cannot close the script tag", () => {
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });
});
