import { describe, expect, it } from "vitest";
import { pickAuthToken } from "./pick-auth-token";

const session = (expiresAt: number) => ({
  accessToken: "imp-jwt",
  expiresAt,
  impersonatedBy: "a",
  user: { id: "u1", name: "A", email: "a@x.com" },
});

describe("pickAuthToken", () => {
  it("returns the real token when there is no impersonation", () => {
    expect(pickAuthToken(null, "real-jwt")).toBe("real-jwt");
  });

  it("prefers a live impersonation token", () => {
    expect(pickAuthToken(session(2000), "real-jwt", 1000)).toBe("imp-jwt");
  });

  it("ignores an expired impersonation token", () => {
    expect(pickAuthToken(session(1000), "real-jwt", 1000)).toBe("real-jwt");
    expect(pickAuthToken(session(500), null, 1000)).toBeNull();
  });
});
