import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// public/_headers is what Cloudflare serves the app with. The widget is this
// app inside an iframe on a customer's own site, so the site-wide framing rule
// must not apply to /widget/*. The Worker (apps/app/worker/index.ts) owns
// framing there and sets frame-ancestors from the account's allowed sites; the
// two `!` lines only stop the site-wide rule from applying.
const headers = readFileSync(
  join(__dirname, "../../../public/_headers"),
  "utf8",
);

function rulesFor(path: string): string[] {
  const lines = headers.split("\n");
  const start = lines.indexOf(path);
  if (start === -1) return [];
  const rules: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("  ")) break;
    rules.push(line.trim());
  }
  return rules;
}

describe("app response headers", () => {
  it("keeps the app itself from being framed by other sites", () => {
    expect(rulesFor("/*")).toEqual(
      expect.arrayContaining([
        "X-Frame-Options: SAMEORIGIN",
        "Content-Security-Policy: frame-ancestors 'self'",
      ]),
    );
  });

  it("keeps the site-wide framing rule off the widget page", () => {
    expect(rulesFor("/widget/*")).toEqual(
      expect.arrayContaining([
        "! X-Frame-Options",
        "! Content-Security-Policy",
      ]),
    );
  });
});
