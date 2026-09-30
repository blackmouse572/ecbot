// Captures the app screenshots listed in screenshots.config.mjs, once per
// docs language.
//
//   pnpm --filter docs shots                  every shot
//   pnpm --filter docs shots knowledge-base   only these
//
// Needs the API and app running locally with a demo workspace:
//   SHOTS_APP_URL    app URL (default http://localhost:5173)
//   SHOTS_API_URL    API URL (default http://localhost:8080)
//   SHOTS_EMAIL / SHOTS_PASSWORD   a local account (default: the seed admin)
//   SHOTS_WORKSPACE  workspace slug, SHOTS_AGENT  agent id
//   SHOTS_API_KEY    "key:secret"; defaults to VITE_API_KEY(_SECRET) in apps/app/.env
//
// Writes public/_docs/screenshots/<lang>/<name>.png and mark positions (as
// percentages, so the overlay scales) to generated/screenshots.json. A shot
// that fails keeps its previous image and data, and the script exits 1.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { shots } from "../screenshots.config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en", "vi"];
const appUrl = (process.env.SHOTS_APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
const apiUrl = (process.env.SHOTS_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const vars = { ws: process.env.SHOTS_WORKSPACE, agent: process.env.SHOTS_AGENT };
const dataFile = join(root, "generated/screenshots.json");
const VIEWPORT = { width: 1440, height: 900 };

function apiKey() {
  if (process.env.SHOTS_API_KEY) return process.env.SHOTS_API_KEY;
  const envFile = join(root, "../app/.env");
  const env = Object.fromEntries(
    readFileSync(envFile, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
  );
  return `${env.VITE_API_KEY}:${env.VITE_API_KEY_SECRET}`;
}

async function login() {
  const res = await fetch(`${apiUrl}/api/v1/public/auth/login/credential`, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHOTS_EMAIL ?? "admin@mail.com",
      password: process.env.SHOTS_PASSWORD ?? "aaAA@123",
      turnstileToken: "local",
    }),
  });
  const body = await res.json();
  if (!body.data?.accessToken) throw new Error(`login failed: ${body.message}`);
  return body.data.accessToken;
}

const only = process.argv.slice(2);
const selected = only.length ? shots.filter((s) => only.includes(s.name)) : shots;
const unknown = only.filter((n) => !shots.some((s) => s.name === n));
if (unknown.length) {
  console.error(`Unknown shot(s): ${unknown.join(", ")}. Known: ${shots.map((s) => s.name).join(", ")}`);
  process.exit(1);
}

function resolvePath(path) {
  return path.replace(/:(\w+)/g, (_, key) => {
    if (!vars[key]) throw new Error(`set SHOTS_${key.toUpperCase()} for ${path}`);
    return vars[key];
  });
}

async function rectOf(page, { target, up = 0, nth = 0, to }) {
  const a = await elementRect(page, target, up, nth);
  if (!to) return a;
  const b = await elementRect(page, to, 0, 0);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

async function elementRect(page, target, up, nth) {
  const locator = page.locator(target).nth(nth);
  await locator.waitFor({ state: "visible", timeout: 5000 });
  return locator.evaluate((el, up) => {
    let node = el;
    for (let i = 0; i < up && node.parentElement; i++) node = node.parentElement;
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, up);
}

const pct = (v, total) => Math.round((v / total) * 10000) / 100;

// Dev-only overlays (React Query devtools, Agentation, the type checker) and
// motion are hidden so every capture looks like production.
const FREEZE_CSS =
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" +
  "::-webkit-scrollbar{display:none}" +
  ".tsqd-parent-container,[data-agentation-portal],agentation-toolbar,vite-plugin-checker-error-overlay{display:none!important}";

const token = await login();
const data = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, "utf8")) : {};
const browser = await chromium.launch();
const failures = [];

for (const lang of LANGS) {
  const imageDir = join(root, "public/_docs/screenshots", lang);
  mkdirSync(imageDir, { recursive: true });

  for (const shot of selected) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1.5,
      reducedMotion: "reduce",
      colorScheme: "light",
      locale: lang === "vi" ? "vi-VN" : "en-US",
    });
    // The app reads its language from this cookie and its session from localStorage.
    await context.addCookies([{ name: "medusa_admin_language", value: lang, url: appUrl }]);
    await context.addInitScript((t) => localStorage.setItem("eccho:access-token", JSON.stringify(t)), token);
    const page = await context.newPage();
    const label = `${shot.name} (${lang})`;
    try {
      await page.goto(appUrl + resolvePath(shot.path), { waitUntil: "load" });
      await page.waitForTimeout(3500);
      await page.addStyleTag({ content: FREEZE_CSS });
      if (shot.setup) await shot.setup(page);

      const marks = {};
      for (const mark of shot.marks) {
        let r;
        try {
          r = await rectOf(page, mark);
        } catch (e) {
          throw new Error(`mark "${mark.id}" (${mark.target}): ${e.message.split("\n")[0]}`);
        }
        const pad = mark.pad ?? 0;
        const x1 = Math.max(r.x - pad, 0);
        const y1 = Math.max(r.y - pad, 0);
        const x2 = Math.min(r.x + r.width + pad, VIEWPORT.width);
        const y2 = Math.min(r.y + r.height + pad, VIEWPORT.height);
        if (x2 <= x1 || y2 <= y1) throw new Error(`mark "${mark.id}" is outside the screenshot`);
        marks[mark.id] = {
          x: pct(x1, VIEWPORT.width),
          y: pct(y1, VIEWPORT.height),
          w: pct(x2 - x1, VIEWPORT.width),
          h: pct(y2 - y1, VIEWPORT.height),
        };
      }

      await page.screenshot({ path: join(imageDir, `${shot.name}.png`), animations: "disabled" });
      data[shot.name] = {
        ...data[shot.name],
        [lang]: { src: `/_docs/screenshots/${lang}/${shot.name}.png`, ...VIEWPORT, marks },
      };
      console.log(`✓ ${label} (${Object.keys(marks).length} marks)`);
    } catch (e) {
      failures.push(`${label}: ${e.message.split("\n")[0]}`);
      console.error(`✗ ${label}: ${e.message.split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
}

await browser.close();
const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(dataFile, JSON.stringify(sorted, null, 2) + "\n");

if (failures.length) {
  console.error(`\n${failures.length} capture(s) failed; their previous image and data were kept:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
