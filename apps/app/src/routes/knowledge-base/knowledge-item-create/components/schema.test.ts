import { describe, expect, it } from "vitest";
import { createUrlSchema } from "./schema";

describe("createUrlSchema", () => {
  const base = { title: "Example" };

  it("accepts a missing metadata object", () => {
    const result = createUrlSchema().safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepts an unset description (metadata.content undefined)", () => {
    // Mirrors what React Hook Form submits when the description textarea
    // is left empty — the key is present with an undefined value.
    const result = createUrlSchema().safeParse({
      ...base,
      metadata: { content: undefined },
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty description", () => {
    const result = createUrlSchema().safeParse({
      ...base,
      metadata: { content: "" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a filled-in description", () => {
    const result = createUrlSchema().safeParse({
      ...base,
      metadata: { content: "Some notes" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-string description", () => {
    const result = createUrlSchema().safeParse({
      ...base,
      metadata: { content: 42 },
    });
    expect(result.success).toBe(false);
  });
});
