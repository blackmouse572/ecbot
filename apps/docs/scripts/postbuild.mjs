/* Runs after `next build`:
 * 1. Moves out/_next to out/_docs/_next to match `assetPrefix: "/_docs"`,
 *    because ecbot.dev/_next belongs to the marketing site.
 * 2. Checks every page's SEO tags: a self canonical, hreflang alternates,
 *    OpenGraph image and a JSON-LD graph. A page missing any of them fails
 *    the build instead of quietly dropping out of search results. */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecbot.dev";

const from = path.join(OUT, "_next");
const to = path.join(OUT, "_docs/_next");
if (fs.existsSync(from)) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);
}

function* pages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "_docs") yield* pages(full);
    } else if (entry.name.endsWith(".html") && !/^(404|_not-found)/.test(entry.name)) {
      yield full;
    }
  }
}

const failures = [];
let checked = 0;
for (const file of pages(OUT)) {
  const html = fs.readFileSync(file, "utf8");
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
  const route = path
    .relative(OUT, file)
    .replace(/\\/g, "/")
    .replace(/\.html$/, "")
    .replace(/(^|\/)index$/, "");
  if (!/^(en|vi)\/docs/.test(route)) continue;
  checked++;

  const expected = `${SITE}/${route}`;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== expected) failures.push(`${route}: canonical ${canonical ?? "missing"}, expected ${expected}`);
  if (!/<link rel="alternate" hrefLang="x-default"/i.test(html)) failures.push(`${route}: no hreflang x-default`);
  if (!/<meta property="og:image"/.test(html)) failures.push(`${route}: no og:image`);
  if (!/<script type="application\/ld\+json">/.test(html)) failures.push(`${route}: no JSON-LD`);
}

if (!checked) failures.push("no docs pages found in out/");
if (failures.length) {
  console.error(`✗ SEO check failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ ${checked} docs pages have canonical, hreflang, og:image and JSON-LD`);
