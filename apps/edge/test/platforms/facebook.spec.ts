import { describe, it, expect } from "vitest";
import { facebookChallengeVerifier } from "../../src/platforms/facebook";
import { getChallengeVerifier } from "../../src/platforms/registry";

// Compared against setup.ts's fixed process.env.FACEBOOK_WEBHOOK_SECRET
// ("verify-me") — the verifier reads it directly from src/env, no longer
// takes it as a parameter.
describe("facebookChallengeVerifier", () => {
  it("echoes hub.challenge with 200 when the verify token matches", () => {
    const url = new URL(
      "https://edge/webhooks/messenger?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123",
    );
    const res = facebookChallengeVerifier.verify(url);
    expect(res.status).toBe(200);
  });

  it("rejects with 403 when the verify token doesn't match", () => {
    const url = new URL(
      "https://edge/webhooks/messenger?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123",
    );
    const res = facebookChallengeVerifier.verify(url);
    expect(res.status).toBe(403);
  });

  it("rejects with 403 when hub.mode isn't subscribe", () => {
    const url = new URL(
      "https://edge/webhooks/messenger?hub.mode=unsubscribe&hub.verify_token=verify-me&hub.challenge=123",
    );
    const res = facebookChallengeVerifier.verify(url);
    expect(res.status).toBe(403);
  });
});

describe("challenge verifier registry", () => {
  it("resolves both the messenger and facebook slugs to the same verifier", () => {
    expect(getChallengeVerifier("messenger")).toBe(facebookChallengeVerifier);
    expect(getChallengeVerifier("facebook")).toBe(facebookChallengeVerifier);
  });

  it("returns undefined for a platform with no registered verifier", () => {
    expect(getChallengeVerifier("zalo")).toBeUndefined();
    expect(getChallengeVerifier("bogus")).toBeUndefined();
  });
});
