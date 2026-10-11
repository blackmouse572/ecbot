import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// public/_headers is what Cloudflare serves the app with. The widget is this
// app inside an iframe on a customer's own site, so a framing rule that also
// covered /widget/* would blank every embedded widget.
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

  it("leaves the widget page frameable from a customer's site", () => {
    expect(rulesFor("/widget/*")).toEqual([
      "! X-Frame-Options",
      "! Content-Security-Policy",
    ]);
  });
});
