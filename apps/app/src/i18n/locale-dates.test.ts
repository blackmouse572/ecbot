import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });

// A date formatted with no locale follows the browser, so an English browser
// shows 10/12/2026 for 12 October in the Vietnamese UI (#257).
describe("dates follow the UI language", () => {
  it("never formats a date without a locale", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => [line, i + 1] as const)
        .filter(([line]) => /\.toLocale(Date)?String\(\)/.test(line))
        .map(([, n]) => `${relative(SRC, file)}:${n}`),
    );

    expect(offenders).toEqual([]);
  });
});
