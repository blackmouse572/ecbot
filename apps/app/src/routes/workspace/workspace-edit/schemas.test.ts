import { describe, expect, it } from "vitest";
import { createWorkspaceEditSchema } from "./schemas";

describe("createWorkspaceEditSchema", () => {
  const schema = createWorkspaceEditSchema("current");

  it("rejects a slug longer than the API column", () => {
    const result = schema.safeParse({ name: "Shop", slug: "a".repeat(101) });

    expect(result.success).toBe(false);
  });

  it("accepts a slug at the limit", () => {
    const result = schema.safeParse({ name: "Shop", slug: "a".repeat(100) });

    expect(result.success).toBe(true);
  });
});
