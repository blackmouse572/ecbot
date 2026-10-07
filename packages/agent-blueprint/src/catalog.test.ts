import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES, getBusinessType } from "./business-types";
import {
  ADDRESS_STYLE, COLLECT, FACTS, GOALS, RULES, promptOf,
} from "./libraries";
import { PRESETS } from "./presets";

const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);

describe("catalog", () => {
  it("has 16 SMB and 5 personal types", () => {
    expect(BUSINESS_TYPES.filter((t) => !t.personal)).toHaveLength(16);
    expect(BUSINESS_TYPES.filter((t) => t.personal)).toHaveLength(5);
  });

  it("uses detailed mode for exactly the five high-stakes types", () => {
    const detailed = BUSINESS_TYPES.filter((t) => t.mode === "detailed").map((t) => t.id).sort();
    expect(detailed).toEqual(["education", "finance", "healthcare", "hotel", "real_estate"]);
  });

  it("gives every type a preset whose ids all exist in the libraries", () => {
    for (const type of BUSINESS_TYPES) {
      const preset = PRESETS[type.id];
      expect(preset, type.id).toBeDefined();
      preset.goals.forEach((g) => expect(ids(GOALS)).toContain(g));
      preset.rules.forEach((r) => expect(ids(RULES)).toContain(r));
      preset.facts.forEach((f) => expect(ids(FACTS)).toContain(f));
      preset.collect.forEach((c) => expect(ids(COLLECT)).toContain(c));
      expect(preset.goals.length, type.id).toBeGreaterThan(0);
    }
  });

  it("never uses an em dash in prompt text", () => {
    const all = [...BUSINESS_TYPES.map((t) => t.promptLabel), ...[GOALS, RULES, FACTS, COLLECT].flat().map((x) => x.prompt)];
    all.forEach((text) => expect(text).not.toContain("—"));
  });

  it("looks up a type by id", () => {
    expect(getBusinessType("healthcare").mode).toBe("detailed");
  });

  it("keeps Vietnamese pronouns intact", () => {
    expect(promptOf(ADDRESS_STYLE, "toi_quykhach")).toContain('"quý khách"');
    expect(promptOf(ADDRESS_STYLE, "em_anhchi")).toContain('"chị"');
  });
});

// #155: the online store asked "Shipping fees and times" and then "Do you
// deliver? How?" (a restaurant question). One delivery question per preset.
describe("presets", () => {
  it("never ask about shipping and delivery separately", () => {
    const both = Object.entries(PRESETS)
      .filter(
        ([, preset]) =>
          preset.facts.includes("shipping_fee") &&
          preset.facts.includes("delivery"),
      )
      .map(([id]) => id);

    expect(both).toEqual([]);
  });
});
