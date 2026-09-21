import type { WorkSpaceGetResponseDto } from "@repo/client";
import { describe, expect, it } from "vitest";
import { resolveWorkspaceSlug } from "./workspace";

const ws = (slug: string) => ({ id: slug, slug }) as WorkSpaceGetResponseDto;

describe("resolveWorkspaceSlug", () => {
  it("returns the last visited slug when it is still in the list", () => {
    expect(resolveWorkspaceSlug([ws("alpha"), ws("beta")], "beta")).toBe(
      "beta",
    );
  });

  it("falls back to the first workspace when the last slug is gone", () => {
    expect(resolveWorkspaceSlug([ws("alpha"), ws("beta")], "deleted")).toBe(
      "alpha",
    );
  });

  it("falls back to the first workspace when there is no last slug", () => {
    expect(resolveWorkspaceSlug([ws("alpha")], null)).toBe("alpha");
  });

  it("returns undefined when there are no workspaces", () => {
    expect(resolveWorkspaceSlug([], "alpha")).toBeUndefined();
  });
});
