import { describe, expect, it } from "vitest";
import { buildTestArgs } from "./test-args";

describe("buildTestArgs", () => {
  it("adds filled path variables over the JSON args, as numbers for number parameters", () => {
    const schema = {
      type: "object",
      properties: { id: { type: "integer" }, sku: { type: "string" } },
    };
    expect(
      buildTestArgs(
        '{"id": 9, "lang": "vi"}',
        { id: "1", sku: "007", shop: " " },
        schema,
      ),
    ).toEqual({ id: 1, sku: "007", lang: "vi" });
  });

  it("is null when the JSON is not an object", () => {
    expect(buildTestArgs("[1]", {})).toBeNull();
    expect(buildTestArgs("{", {})).toBeNull();
  });
});
