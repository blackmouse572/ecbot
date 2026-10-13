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

  // Returning the same array reference across calls proves the section is
  // built once from an eagerly-globbed registry rather than re-scanned on
  // every call, without asserting against the enterprise tree itself.
  it("returns the same array reference on every call", () => {
    const first = enterpriseUserSection();
    expect(enterpriseUserSection()).toBe(first);
  });
});
