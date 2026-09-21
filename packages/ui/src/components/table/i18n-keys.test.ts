import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { uiTestI18nResources } from "../../../test/i18n";
import { UI_TABLE_I18N_KEYS } from "./i18n-keys";

// Widened: the `as const` tuple narrows `includes` to its own literals.
const DECLARED: readonly string[] = UI_TABLE_I18N_KEYS;

// Anchored on the vitest root (packages/ui) rather than import.meta.url, which
// is not a file URL under jsdom. A wrong path throws from readdirSync, and the
// non-empty assertion below catches a scan that silently finds nothing.
const SOURCE_ROOTS = [
  join(process.cwd(), "src/components/table"),
  // The table's empty states are @repo/ui's NoRecords/NoResults, so their keys
  // are part of this contract even though they live outside the table tree.
  join(process.cwd(), "src/components/common/empty-table-content"),
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
    return [path];
  });
}

function renderedKeys(): string[] {
  const files = [...new Set(SOURCE_ROOTS.flatMap(sourceFiles))];
  const keys = files.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/\bt\(\s*"([^"]+)"/g)].map(
      (m) => m[1] as string,
    ),
  );
  return [...new Set(keys)].sort();
}

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? collectKeys(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("UI_TABLE_I18N_KEYS", () => {
  // The contract is only worth anything if it tracks the source. Comparing it
  // against a hand-written fixture would pass for a component that adds a key
  // and updates neither list — which is exactly the drift that ships raw key
  // strings to users.
  it("declares every key the table components render", () => {
    const rendered = renderedKeys();

    expect(rendered).not.toHaveLength(0);
    expect(rendered.filter((key) => !DECLARED.includes(key))).toEqual([]);
  });

  it("declares no key that is no longer rendered", () => {
    const rendered = renderedKeys();

    expect(DECLARED.filter((key) => !rendered.includes(key))).toEqual([]);
  });

  // Keeps this package's own test fixture able to render every declared key —
  // otherwise a test could assert on a value that quietly falls through.
  it("is fully covered by the test fixture", () => {
    expect(
      DECLARED.filter((key) => !collectKeys(uiTestI18nResources).includes(key)),
    ).toEqual([]);
  });
});
