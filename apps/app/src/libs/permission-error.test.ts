import { describe, expect, it } from "vitest";
import { isNoPermissionError } from "./permission-error";

const apiError = (status: number, statusCode?: number) => ({
  response: { status, data: { statusCode } },
});

describe("isNoPermissionError", () => {
  it("is true for a 403", () => {
    expect(isNoPermissionError(apiError(403, 5100))).toBe(true);
  });

  it("is true for the owner guard's 400 5208", () => {
    expect(isNoPermissionError(apiError(400, 5208))).toBe(true);
  });

  it("is false for a suspended workspace's 403", () => {
    expect(isNoPermissionError(apiError(403, 5215))).toBe(false);
  });

  it("is false for other errors", () => {
    expect(isNoPermissionError(apiError(400, 5000))).toBe(false);
    expect(isNoPermissionError(apiError(500))).toBe(false);
    expect(isNoPermissionError(new Error("boom"))).toBe(false);
    expect(isNoPermissionError(null)).toBe(false);
  });
});
