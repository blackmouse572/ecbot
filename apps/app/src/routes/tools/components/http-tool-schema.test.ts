import { describe, expect, it } from "vitest";
import { createHttpToolSchema, httpToolTestSchema } from "./http-tool-schema";

const base = {
  name: "Weather",
  description: "Looks up the weather",
  httpMethod: "GET" as const,
  httpUrl: "https://example.com",
};

// `Number("") === 0`, so a bare `z.coerce.number()` turns a cleared field into
// a real 0 instead of "unset" — one of these stuck on a validation error with
// no way back to empty, the other silently submitted 0.
describe("createHttpToolSchema numeric fields", () => {
  it("treats a cleared timeout as unset rather than failing on 0", () => {
    const result = createHttpToolSchema.safeParse({ ...base, timeoutMs: "" });

    expect(result.success).toBe(true);
    expect(result.data?.timeoutMs).toBeUndefined();
  });

  it("treats a cleared max-retries as unset rather than 0", () => {
    const result = createHttpToolSchema.safeParse({ ...base, maxRetries: "" });

    expect(result.success).toBe(true);
    expect(result.data?.maxRetries).toBeUndefined();
  });

  it("still coerces and range-checks real values", () => {
    const ok = createHttpToolSchema.safeParse({
      ...base,
      timeoutMs: "5000",
      maxRetries: "2",
    });
    expect(ok.data).toMatchObject({ timeoutMs: 5000, maxRetries: 2 });

    expect(
      createHttpToolSchema.safeParse({ ...base, timeoutMs: "-1" }).success,
    ).toBe(false);
    expect(
      createHttpToolSchema.safeParse({ ...base, maxRetries: "9" }).success,
    ).toBe(false);
  });
});

// The test panel issues the request; naming the tool is a save-time concern.
describe("httpToolTestSchema", () => {
  it("accepts a draft with no name or description", () => {
    const result = httpToolTestSchema.safeParse({
      ...base,
      name: "",
      description: "",
    });

    expect(result.success).toBe(true);
  });

  it("still rejects a bad request field", () => {
    const result = httpToolTestSchema.safeParse({
      ...base,
      name: "",
      description: "",
      httpUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("does not relax the schema used to save", () => {
    expect(
      createHttpToolSchema.safeParse({ ...base, name: "", description: "" })
        .success,
    ).toBe(false);
  });
});
