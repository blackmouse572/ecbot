import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it } from "vitest";
import z from "zod";

// Every form in the app reaches `Form.ErrorMessage` through this mapping, and
// none of it is ours — it is `@hookform/resolvers` behaviour we depend on.
// A resolver written against zod 3 detects a ZodError via `err.errors`, which
// zod 4 renamed to `issues`; it rethrows instead, and the whole form silently
// stops reporting. These cases pin the contract so a future bump that changes
// the shape, the criteria mode, or the nesting fails here rather than in the UI.
//
// Carried over from the `zodV4Resolver` shim's own tests: the shim existed
// because `@hookform/resolvers@3.4.2` got this wrong, and 5.9.1 satisfies the
// same five cases unchanged.
const opts = {} as never;

/** `ResolverResult.errors` is a union until the result is narrowed; the tests
 *  only care about the error map, so read it through one helper. */
const errorsOf = (result: { errors: unknown }) =>
  result.errors as Record<string, { type?: string; message?: string }>;

describe("zodResolver", () => {
  it("maps a failed field onto RHF's error shape", async () => {
    const schema = z.object({ name: z.string().min(1) });

    const result = await zodResolver(schema)({ name: "" }, undefined, opts);

    expect(Object.keys(errorsOf(result))).toEqual(["name"]);
    expect(errorsOf(result).name).toMatchObject({ type: "too_small" });
    expect(errorsOf(result).name?.message).toBeTruthy();
    // RHF expects values emptied when validation fails.
    expect(result.values).toEqual({});
  });

  it("returns parsed values and no errors when valid", async () => {
    const schema = z.object({ name: z.string().min(1), n: z.number() });

    const result = await zodResolver(schema)(
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

    const result = await zodResolver(schema)(
      { name: "", slug: "NOPE" },
      undefined,
      opts,
    );

    expect(Object.keys(errorsOf(result)).sort()).toEqual(["name", "slug"]);
  });

  // Matches @hookform/resolvers' default "firstError" criteria mode.
  it("keeps only the first error for a field", async () => {
    const schema = z.object({
      slug: z
        .string()
        .min(5)
        .regex(/^[a-z]+$/),
    });

    const result = await zodResolver(schema)({ slug: "A" }, undefined, opts);

    expect(errorsOf(result).slug).toBeDefined();
    expect(Object.keys(errorsOf(result))).toEqual(["slug"]);
  });

  it("nests errors for nested objects", async () => {
    const schema = z.object({
      meta: z.object({ label: z.string().min(1) }),
    });

    const result = await zodResolver(schema)(
      { meta: { label: "" } },
      undefined,
      opts,
    );

    expect(result.errors).toMatchObject({
      meta: { label: { type: "too_small" } },
    });
  });

  // The zod-4 break this whole upgrade was about: a schema whose input and
  // output differ must still parse, and hand back the coerced output.
  it("returns the coerced output for a schema that transforms", async () => {
    const schema = z.object({
      temperature: z.coerce.number().min(0).max(2).default(1),
    });

    const result = await zodResolver(schema)(
      { temperature: "1.5" },
      undefined,
      opts,
    );

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ temperature: 1.5 });
  });
});
