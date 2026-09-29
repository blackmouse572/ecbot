import { describe, expect, it } from "vitest";
import { loginRedirectPath } from "./login-redirect";

describe("loginRedirectPath", () => {
  it("keeps the query string, so an invite link survives the login detour", () => {
    const to = loginRedirectPath({
      pathname: "/join",
      search: "?tokens=a.b.c",
    });

    expect(to).toBe("/login?redirect=%2Fjoin%3Ftokens%3Da.b.c");
    expect(new URLSearchParams(to.split("?")[1]).get("redirect")).toBe(
      "/join?tokens=a.b.c",
    );
  });

  it("returns the plain path when there is no query", () => {
    expect(
      loginRedirectPath({ pathname: "/kunmart/dashboard", search: "" }),
    ).toBe("/login?redirect=%2Fkunmart%2Fdashboard");
  });
});
