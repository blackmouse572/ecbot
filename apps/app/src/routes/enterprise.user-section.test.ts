import { describe, expect, it } from "vitest";
import { enterpriseUserSection } from "./enterprise.user-section";

// Deliberately does NOT assert an empty array: in the enterprise tree the
// overlay is materialised and the glob matches, so `[]` would fail there.
describe("enterpriseUserSection", () => {
  it("returns components whether or not the overlay is materialised", () => {
    const sections = enterpriseUserSection();
    expect(Array.isArray(sections)).toBe(true);
    for (const section of sections) {
      expect(["function", "object"]).toContain(typeof section);
    }
  });
});
