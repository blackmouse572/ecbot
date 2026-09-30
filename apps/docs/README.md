# Ecbot Docs

User docs for shop owners, served at `ecbot.dev/en/docs` and `ecbot.dev/vi/docs`. Built with Next.js and [Fumadocs](https://fumadocs.dev) as a static export, and served by a small Cloudflare Worker.

```bash
pnpm dev:docs                  # http://localhost:5175/en/docs
pnpm --filter docs test        # content, SEO and worker tests
pnpm --filter docs build       # static export to out/, then the SEO check
pnpm --filter docs preview     # serve out/ through the worker (wrangler dev)
```

## Writing a page

Pages live in `content/docs/`, one file per language: `<slug>.<lang>.mdx`. A folder is a sidebar group; its `index.<lang>.mdx` is the page the group title opens, and its `meta.<lang>.json` sets the group title and page order. `test/content.test.ts` enforces the rules below, because search engines and answer engines quote these parts directly:

- every page exists in both `en` and `vi`;
- `title` fits in 48 characters (it gets the " | Ecbot Docs" suffix);
- `description` is 50 to 160 characters;
- the first block is a plain paragraph of at most 70 words that answers the page's question;
- `faq` has at least 3 entries (rendered after the body and published as FAQPage JSON-LD);
- no em dash, and links to other pages use `/docs/<path>`, for example `/docs/agents/skills` (the reader's language is added for you).

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

Cloudflare Workers Builds deploys the `ecbot-docs` Worker (eccho account) through the Cloudflare GitHub app. There is no manual deploy. A push to `main` that changes the docs runs:

- build: `pnpm install --frozen-lockfile --filter "docs..." && pnpm --filter docs build`
- deploy: `pnpm --filter docs exec wrangler deploy`

The trigger only starts a build for changes under `apps/docs/**`, `packages/favicons/**` and `packages/typescript-config/**`, or to the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `turbo.json`. Changes that do not affect the site are skipped: the README, `AGENTS.md`/`CLAUDE.md`, lint and test config, tests, and the screenshot capture script and config. `NEXT_PUBLIC_SITE_URL` is set on the trigger to `https://ecbot.dev`.

`wrangler.jsonc` holds the routes, so each deploy applies them: `ecbot.dev/en/docs*`, `ecbot.dev/vi/docs*`, `ecbot.dev/docs*` and `ecbot.dev/_docs/*`. The marketing site owns the rest of the domain as a Custom Domain, and routes run in front of it. That is also why the Next assets are served from `/_docs/_next` instead of `/_next`. A bare `/docs` link redirects to the visitor's language (the `NEXT_LOCALE` cookie, then `Accept-Language`). The Worker has no `workers.dev` URL.
