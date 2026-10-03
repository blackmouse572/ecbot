import { describe, expect, it } from "vitest";
import { toWorkspaceSlug } from "./to-workspace-slug";

// The preview must show the slug apps/api actually creates
// (workspace-slug.util.ts: slugify, vi locale, strict, cut to 100).
describe("toWorkspaceSlug", () => {
  it.each([
    ["Cửa hàng Kunmart", "cua-hang-kunmart"],
    ["Đồ ăn & Uống", "do-an-and-uong"],
    ["Shop 100%", "shop-100percent"],
    ["Quần áo $5", "quan-ao-dollar5"],
    ["Cà phê ₫", "ca-phe-dong"],
    ["Straße", "strasse"],
  ])("%s -> %s", (input, slug) => {
    expect(toWorkspaceSlug(input)).toBe(slug);
  });

  it("cuts a long name to 100 characters without a trailing hyphen", () => {
    const slug = toWorkspaceSlug(`${"a".repeat(99)} b`);

    expect(slug).toBe("a".repeat(99));
  });
});
