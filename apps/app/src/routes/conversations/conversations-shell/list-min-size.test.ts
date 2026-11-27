import { describe, expect, it } from "vitest";
import { LIST_MAX_SIZE, listMinSize } from "./list-min-size";

describe("listMinSize", () => {
  it.each([1024, 1440, 1920])(
    "keeps the list at 240px or wider in a %ipx group",
    (width) => {
      expect((listMinSize(width) / 100) * width).toBeCloseTo(240);
    },
  );

  it("never goes past the list's maximum on a narrow group", () => {
    expect(listMinSize(500)).toBe(LIST_MAX_SIZE);
  });

  it("falls back to the old ratio before the group is measured", () => {
    expect(listMinSize(0)).toBe(16);
  });
});
