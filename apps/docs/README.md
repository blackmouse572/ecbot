# Ecbot Docs

User docs for shop owners, served at `ecbot.dev/en/docs` and `ecbot.dev/vi/docs`. Built with Next.js and [Fumadocs](https://fumadocs.dev) as a static export, and served by a small Cloudflare Worker.

```bash
pnpm dev:docs                  # http://localhost:5175/en/docs
pnpm --filter docs test        # content, SEO and worker tests
pnpm --filter docs build       # static export to out/, then the SEO check
pnpm --filter docs preview     # serve out/ through the worker (wrangler dev)
```

## Writing a page

Pages live in `content/docs/<slug>.<lang>.mdx`, one file per language, and the order is set in `meta.<lang>.json`. `test/content.test.ts` enforces the rules below, because search engines and answer engines quote these parts directly:

- every page exists in both `en` and `vi`;
- `title` fits in 48 characters (it gets the " | Ecbot Docs" suffix);
- `description` is 50 to 160 characters;
- the first block is a plain paragraph of at most 70 words that answers the page's question;
- `faq` has at least 3 entries (rendered after the body and published as FAQPage JSON-LD);
- no em dash, and links to other pages use `/docs/<slug>` (the reader's language is added for you).

Only describe what the app does today. Write for shop owners, with the labels the app shows in that language.

## Screenshots

`<Screenshot>` shows an app screenshot in the page's language, with numbered callouts:

```mdx
<Screenshot name="knowledge-base" alt="The knowledge base list">
  <Mark id="create">**Create** adds a new item.</Mark>
</Screenshot>
```

Shots and the positions of their marks are defined in `screenshots.config.mjs`. To capture them, run the API and app locally with a demo workspace, then:

```bash
SHOTS_WORKSPACE=<workspace-slug> SHOTS_AGENT=<agent-id> pnpm --filter docs shots [name...]
```

This writes `public/_docs/screenshots/<lang>/<name>.png` and `generated/screenshots.json`. It logs in as the seed admin by default (`SHOTS_EMAIL`, `SHOTS_PASSWORD`, `SHOTS_API_KEY`, `SHOTS_APP_URL` and `SHOTS_API_URL` override it). A screenshot or mark that is missing fails the tests and the build.

## SEO and AI search

- Every page has a self canonical, `en`/`vi`/`x-default` hreflang, OpenGraph and Twitter tags, a generated OG image, and a JSON-LD graph: TechArticle, BreadcrumbList and FAQPage. The graph is linked to the marketing site's `#organization` and `#website` ids.
- `/docs/sitemap.xml` lists every page with its alternates and its last git commit date.
- `/docs/llms.txt` indexes the pages for AI assistants, and `/docs/llms-full.txt` holds all of the text. `/docs/md/<lang>/<slug>.md` is the Markdown copy of each page, which the page links to with `rel="alternate" type="text/markdown"`.
- `scripts/postbuild.mjs` fails the build when a page is missing its canonical, hreflang, `og:image` or JSON-LD.

## Deploy

The site deploys with Cloudflare Workers Builds, using `wrangler.jsonc`:

- **Build command:** `pnpm --filter docs build`
- **Deploy command:** `pnpm --filter docs exec wrangler deploy`
- **Build variable:** `NEXT_PUBLIC_SITE_URL` (default `https://ecbot.dev`)
- **Routes** on the `ecbot.dev` zone, pointed at this worker:
  - `ecbot.dev/en/docs*`
  - `ecbot.dev/vi/docs*`
  - `ecbot.dev/docs*`
  - `ecbot.dev/_docs/*`

The marketing site owns the rest of the domain. That's why the Next assets are served from `/_docs/_next` instead of `/_next`. A bare `/docs` link redirects to the visitor's language (using the `NEXT_LOCALE` cookie, then `Accept-Language`). On the marketing site, `robots.txt` should list `/docs/sitemap.xml`, and its `llms.txt` should link `/docs/llms.txt`.
