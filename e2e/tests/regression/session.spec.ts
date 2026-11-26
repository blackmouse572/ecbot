// e2e/tests/regression/session.spec.ts
import { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/index";
import { signUpUser, waitForTurnstile } from "../../fixtures/auth.fixture";
import { API_URL, API_KEY } from "../../config";

// The access-token check remembers a session Redis said is active, in each API
// instance's memory, for 30 s (SessionService.isLoginSessionActive). E2E runs
// one API instance, so whatever ends a session must still take effect on the
// very next request, and a revoked session must never refresh. Each test warms
// that memory first, so a revoke that forgot to evict it would pass for 30 s.

type SignedIn = { ctx: APIRequestContext; token: string };

const headers = (token?: string) => ({
  "x-api-key": API_KEY,
  ...(token && { Authorization: `Bearer ${token}` }),
});

/** The session id the API put in the access token. */
function sessionOf(accessToken: string): string {
  const payload = accessToken.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString()).session;
}

test.describe("Login sessions", () => {
  // Own request context per sign-in: its own refresh cookie, so its own session.
  let contexts: APIRequestContext[] = [];

  test.afterEach(async () => {
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
    contexts = [];
  });

  const signIn = async (
    playwright: { request: { newContext(): Promise<APIRequestContext> } },
    email: string,
    password: string,
  ): Promise<SignedIn> => {
    const ctx = await playwright.request.newContext();
    contexts.push(ctx);
    const res = await ctx.post(
      `${API_URL}/api/v1/public/auth/login/credential`,
      { headers: headers(), data: { email, password } },
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    return { ctx, token: (await res.json()).data.accessToken };
  };

  const profileStatus = async ({ ctx, token }: SignedIn) =>
    (
      await ctx.get(`${API_URL}/api/v1/shared/user/profile`, {
        headers: headers(token),
      })
    ).status();

  // The refresh route reads the refresh cookie of that context's sign-in.
  const refreshStatus = async ({ ctx }: SignedIn) =>
    (
      await ctx.post(`${API_URL}/api/v1/shared/auth/refresh`, {
        headers: headers(),
      })
    ).status();

  test("revoking a session locks out its token on the next request, and only that session", async ({
    api,
    playwright,
  }) => {
    const user = await signUpUser(api);
    const first = await signIn(playwright, user.email, user.password);
    const second = await signIn(playwright, user.email, user.password);

    // The second request is answered from memory.
    expect(await profileStatus(first)).toBe(200);
    expect(await profileStatus(first)).toBe(200);

    const revoke = await second.ctx.delete(
      `${API_URL}/api/v1/shared/session/revoke/${sessionOf(first.token)}`,
      { headers: headers(second.token) },
    );
    expect(revoke.ok(), await revoke.text()).toBeTruthy();

    expect(await profileStatus(first)).toBe(401);
    expect(await refreshStatus(first)).toBe(401);

    expect(await profileStatus(second)).toBe(200);
    expect(await refreshStatus(second)).toBe(200);
  });

  test("logging out ends the session on the next request", async ({
    api,
    playwright,
  }) => {
    const user = await signUpUser(api);
    const session = await signIn(playwright, user.email, user.password);
    expect(await profileStatus(session)).toBe(200);

    const logout = await session.ctx.post(
      `${API_URL}/api/v1/shared/auth/logout`,
      { headers: headers(session.token) },
    );
    expect(logout.ok(), await logout.text()).toBeTruthy();

    expect(await profileStatus(session)).toBe(401);
    expect(await refreshStatus(session)).toBe(401);
  });

  test("a browser whose session is revoked elsewhere is sent back to sign in", async ({
    page,
    api,
    playwright,
  }) => {
    const user = await signUpUser(api);

    await page.goto("/login");
    await page.locator('input[autocomplete="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await waitForTurnstile(page);
    const login = page.waitForResponse((res) =>
      res.url().includes("/api/v1/public/auth/login/credential"),
    );
    // The English label is "Login".
    await page.getByRole("button", { name: /^login$|sign in/i }).click();
    const browserToken: string = (await (await login).json()).data.accessToken;
    await expect(page).toHaveURL(/dashboard|onboard/);

    // Signed in in the browser: reloading keeps the session.
    await page.reload();
    await expect(page).toHaveURL(/dashboard|onboard/);

    const other = await signIn(playwright, user.email, user.password);
    const revoke = await other.ctx.delete(
      `${API_URL}/api/v1/shared/session/revoke/${sessionOf(browserToken)}`,
      { headers: headers(other.token) },
    );
    expect(revoke.ok(), await revoke.text()).toBeTruthy();

    // The next API call 401s, the refresh fails too, and the app signs out.
    await page.reload();
    await expect(page).toHaveURL(/\/login/);
    expect(await profileStatus(other)).toBe(200);
  });
});
