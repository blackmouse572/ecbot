import { describe, expect, it } from "vitest";
import { suffixedWorkspaceSlug } from "./suffixed-workspace-slug";

describe("suffixedWorkspaceSlug", () => {
  it("adds a four character suffix to the name's address", () => {
    expect(suffixedWorkspaceSlug("Tiệm bánh Mây")).toMatch(
      /^tiem-banh-may-[a-z0-9]{4}$/,
    );
  });

  it("still gives an address when the name has no usable letters", () => {
    expect(suffixedWorkspaceSlug("🎉")).toMatch(/^shop-[a-z0-9]{4}$/);
  });
});
