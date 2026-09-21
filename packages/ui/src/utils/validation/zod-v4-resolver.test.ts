import { describe, expect, it } from "vitest";
import z from "zod";
import { zodV4Resolver } from "./zod-v4-resolver";

// The whole reason this shim exists: @hookform/resolvers@3.4.2 detects a
// ZodError via `err.errors`, which zod 4 renamed to `issues`, so the stock
// resolver rethrows and RHF never sees field errors. These tests pin the
// mapping so a resolver upgrade can't silently regress it.
const opts = {} as never;

/** `ResolverResult.errors` is a union until the result is narrowed; the tests
 *  only care about the error map, so read it through one helper. */
const errorsOf = (result: { errors: unknown }) =>
  result.errors as Record<string, { type?: string; message?: string }>;

describe("zodV4Resolver", () => {
  it("maps a failed field onto RHF's error shape", async () => {
    const schema = z.object({ name: z.string().min(1) });

    const result = await zodV4Resolver(schema)({ name: "" }, undefined, opts);

    expect(Object.keys(errorsOf(result))).toEqual(["name"]);
    expect(errorsOf(result).name).toMatchObject({ type: "too_small" });
    expect(errorsOf(result).name?.message).toBeTruthy();
    // RHF expects values emptied when validation fails.
    expect(result.values).toEqual({});

  });

  it("returns parsed values and no errors when valid", async () => {
    const schema = z.object({ name: z.string().min(1), n: z.number() });

    const result = await zodV4Resolver(schema)(
      { name: "Growth", n: 5 },
      undefined,
      opts,
    );

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ name: "Growth", n: 5 });
  });

  it("reports every failing field, not just the first", async () => {
    const schema = z.object({
      name: z.string().min(1),
      slug: z.string().regex(/^[a-z]+$/),
    });

    const result = await zodV4Resolver(schema)(
      { name: "", slug: "NOPE" },
      undefined,
      opts,
    );

    expect(Object.keys(errorsOf(result)).sort()).toEqual(["name", "slug"]);
  });

  // Matches @hookform/resolvers' default "firstError" criteria mode.
  it("keeps only the first error for a field", async () => {
    const schema = z.object({
      slug: z.string().min(5).regex(/^[a-z]+$/),
    });

    const result = await zodV4Resolver(schema)({ slug: "A" }, undefined, opts);

    expect(errorsOf(result).slug).toBeDefined();
    expect(Object.keys(errorsOf(result))).toEqual(["slug"]);
  });

  it("nests errors for nested objects", async () => {
    const schema = z.object({
      meta: z.object({ label: z.string().min(1) }),
    });

    const result = await zodV4Resolver(schema)(
      { meta: { label: "" } },
      undefined,
      opts,
    );

    expect(result.errors).toMatchObject({ meta: { label: { type: "too_small" } } });
  });
});
