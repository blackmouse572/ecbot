import { describe, expect, it } from "vitest";
import { canRevoke, isSessionStatus } from "./session-status";

describe("session status guards", () => {
  it("accepts known statuses and rejects unknown strings", () => {
    expect(isSessionStatus("ACTIVE")).toBe(true);
    expect(isSessionStatus("REVOKED")).toBe(true);
    expect(isSessionStatus("foo")).toBe(false);
  });

  it("only allows revoking an ACTIVE session", () => {
    expect(canRevoke("ACTIVE")).toBe(true);
    expect(canRevoke("REVOKED")).toBe(false);
  });
});
