import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "../src/timing-safe-equal";

describe("timingSafeEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("shh", "shh")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqual("shh", "shx")).toBe(false);
  });

  it("returns false when the candidate is shorter than the expected value", () => {
    expect(timingSafeEqual("sh", "shh")).toBe(false);
  });

  it("returns false when the candidate is longer than the expected value", () => {
    expect(timingSafeEqual("shhh", "shh")).toBe(false);
  });

  it("returns false against an empty string", () => {
    expect(timingSafeEqual("", "shh")).toBe(false);
  });

  // An unset secret must never match — otherwise an empty candidate
  // (e.g. `hub.verify_token=`) is accepted when the env var is missing.
  it("returns false when the expected secret is empty", () => {
    expect(timingSafeEqual("", "")).toBe(false);
  });

  it("returns false when the expected secret is undefined", () => {
    expect(timingSafeEqual("", undefined)).toBe(false);
    expect(timingSafeEqual("undefined", undefined)).toBe(false);
  });
});
