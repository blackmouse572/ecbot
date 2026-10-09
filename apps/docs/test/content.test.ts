/* Content rules for every docs page. Search engines and answer engines quote
 * the title, the description and the first paragraph, so those are checked
 * here instead of in review. */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { faqSchema } from "../lib/schema";
import { TITLE_SUFFIX } from "../lib/seo";
import shots from "../generated/screenshots.json";

const DIR = path.join(__dirname, "../content/docs");
const LANGS = ["en", "vi"];

const pages = (fs.readdirSync(DIR, { recursive: true }) as string[])
  .filter((f) => f.endsWith(".mdx"))
  .map((file) => {
    // "agents/skills.en.mdx" -> base "agents/skills", url path "agents/skills";
    // "agents/index.en.mdx" -> url path "agents"; "index.en.mdx" -> "".
    const [base, lang] = file.replace(/\.mdx$/, "").split(".");
    const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
    const urlPath = base!.replace(/(^|\/)index$/, "");
    return { file, slug: base!, urlPath, lang: lang!, data, content };
  });

const urlPaths = new Set(pages.map((p) => p.urlPath));

describe.each(pages)("$file", ({ file, slug, lang, data, content }) => {
  it("is named <slug>.<lang>.mdx", () => {
    expect(LANGS).toContain(lang);
  });

  it("exists in every language", () => {
    for (const other of LANGS) {
      expect(fs.existsSync(path.join(DIR, `${slug}.${other}.mdx`)), `${slug}.${other}.mdx`).toBe(true);
    }
  });

  it("has a title that fits search results with the suffix", () => {
    expect(typeof data.title).toBe("string");
    expect(data.title.length + TITLE_SUFFIX.length).toBeLessThanOrEqual(60);
  });

  it("has a 50 to 160 character description", () => {
    expect(data.description.length).toBeGreaterThanOrEqual(50);
    expect(data.description.length).toBeLessThanOrEqual(160);
  });

  it("has at least 3 FAQs", () => {
    expect(faqSchema.parse(data.faq).length).toBeGreaterThanOrEqual(3);
  });

  it("opens with a short answer paragraph", () => {
    const first = content.trim().split(/\n\s*\n/)[0]!;
    expect(first, "first block must be a paragraph").not.toMatch(/^(#|<|-|\d+\.)/);
    expect(first.split(/\s+/).length).toBeLessThanOrEqual(70);
  });

  it("uses no em dash", () => {
    const raw = fs.readFileSync(path.join(DIR, file), "utf8");
    expect(raw).not.toContain("\u2014");
  });

  it("links only to docs pages that exist", () => {
    for (const [, target] of content.matchAll(/\]\(\/docs\/?([^)#\s]*)/g)) {
      expect(urlPaths.has(target!.replace(/\/$/, "")), `broken link /docs/${target}`).toBe(true);
    }
  });

  it("uses screenshots and marks that were captured in this language", () => {
    const data = shots as Record<string, Record<string, { marks: Record<string, unknown> }>>;
    for (const [tag] of content.matchAll(/<Screenshot[\s\S]*?<\/Screenshot>/g)) {
      const name = tag.match(/name="([^"]+)"/)![1]!;
      const shot = data[name]?.[lang];
      expect(shot, `screenshot "${name}" (${lang})`).toBeDefined();
      for (const [, id] of tag.matchAll(/<Mark id="([^"]+)"/g)) {
        expect(shot!.marks, `mark "${id}" on "${name}"`).toHaveProperty(id!);
      }
    }
  });
});

// Legal drafts stay reachable by URL (sign-up and the widget link to them)
// but out of navigation and search until counsel signs them off.
describe("legal drafts", () => {
  const legal = pages.filter((p) => p.slug.startsWith("legal/"));

  it("are noindex", () => {
    expect(legal.length).toBeGreaterThan(0);
    for (const p of legal) expect(p.data.noindex, p.file).toBe(true);
  });

  it("are not in the navigation", () => {
    for (const lang of LANGS) {
      const meta = JSON.parse(fs.readFileSync(path.join(DIR, `meta.${lang}.json`), "utf8"));
      expect(meta.pages).not.toContain("legal");
    }
  });
});
