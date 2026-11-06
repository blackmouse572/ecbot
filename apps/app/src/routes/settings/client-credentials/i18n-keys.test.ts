import en from "@/i18n/translations/en.json";
import vi from "@/i18n/translations/vi.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const lookup = (dict: unknown, key: string) =>
  key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      dict,
    );

// Every literal t("…") key on the page, so a new action cannot ship raw keys.
const source = [
  "client-credentials.tsx",
  "components/api-key-quick-start.tsx",
  "components/api-key-reveal.tsx",
  "components/copy-field.tsx",
]
  .map((file) => readFileSync(join(__dirname, file), "utf8"))
  .join("\n");
const KEYS = [
  ...new Set([...source.matchAll(/\bt\("([\w.]+)"/g)].map((m) => m[1]!)),
];

describe("client credentials translations", () => {
  it.each([
    ["en", en],
    ["vi", vi],
  ] as const)("%s has every key the page uses", (_lang, dict) => {
    expect(KEYS.filter((k) => typeof lookup(dict, k) !== "string")).toEqual([]);
  });
});
