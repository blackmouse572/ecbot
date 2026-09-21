import { describe, expect, it } from "vitest";
import { parseOrderParam } from "./use-query-params";

describe("parseOrderParam", () => {
  it("parses `+field` as ascending", () => {
    expect(parseOrderParam("+createdAt")).toEqual({
      orderBy: "createdAt",
      orderDirection: "asc",
    });
  });

  it("parses `-field` as descending", () => {
    expect(parseOrderParam("-createdAt")).toEqual({
      orderBy: "createdAt",
      orderDirection: "desc",
    });
  });

  it("treats a bare field as ascending", () => {
    expect(parseOrderParam("createdAt")).toEqual({
      orderBy: "createdAt",
      orderDirection: "asc",
    });
  });

  it("returns empty sort params when the order is undefined", () => {
    expect(parseOrderParam(undefined)).toEqual({});
  });
});
