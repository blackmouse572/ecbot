import { describe, it, expect, vi, afterEach } from "vitest";
import * as v from "valibot";
import { envSchema } from "../src/env";

const validEnv = {
  SERVER_URL: "http://nest",
  SERVER_API_KEY: "k:s",
  INTERNAL_SECRET: "shh",
  FACEBOOK_WEBHOOK_SECRET: "verify-me",
};

describe("envSchema", () => {
  it("accepts a fully configured env", () => {
    expect(v.safeParse(envSchema, validEnv).success).toBe(true);
  });

  it("rejects a missing var", () => {
    const { INTERNAL_SECRET, ...rest } = validEnv;
    expect(v.safeParse(envSchema, rest).success).toBe(false);
  });

  it("rejects an empty-string var (unfilled .env placeholder)", () => {
    expect(
      v.safeParse(envSchema, { ...validEnv, FACEBOOK_WEBHOOK_SECRET: "" })
        .success,
    ).toBe(false);
  });

  it("rejects a SERVER_URL that isn't a valid URL", () => {
    expect(
      v.safeParse(envSchema, { ...validEnv, SERVER_URL: "not-a-url" })
        .success,
    ).toBe(false);
  });
});

describe("src/env module load", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("throws at import time when a required var is missing", async () => {
    vi.resetModules();
    delete process.env.SERVER_API_KEY;
    await expect(import("../src/env")).rejects.toThrow();
  });
});
