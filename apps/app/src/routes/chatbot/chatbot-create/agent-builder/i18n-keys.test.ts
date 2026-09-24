import en from "@/i18n/translations/en.json";
import vi from "@/i18n/translations/vi.json";
import { allTranslationKeys } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import { BUILDER_UI_KEYS } from "./ui-keys";

const lookup = (dict: unknown, key: string) =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict);

const KEYS = [...allTranslationKeys(), ...BUILDER_UI_KEYS, "actions.skip", "actions.next", "actions.close"];

describe("agent builder translations", () => {
  it.each([["en", en], ["vi", vi]] as const)("%s has every key the builder uses", (_lang, dict) => {
    expect(KEYS.filter((k) => typeof lookup(dict, k) !== "string")).toEqual([]);
  });

  it("never uses an em dash", () => {
    expect(JSON.stringify((en as Record<string, unknown>).agentBuilder)).not.toContain("—");
    expect(JSON.stringify((vi as Record<string, unknown>).agentBuilder)).not.toContain("—");
  });
});
