// e2e/fixtures/auth.fixture.ts
import { APIRequestContext, expect, Page } from "@playwright/test";
import { API_URL, API_KEY } from "../config";

const TEST_KEY = process.env.E2E_TEST_KEY ?? "";

export interface TestUser {
  userId: string;
  email: string;
  password: string;
  name: string;
}

/**
 * Fetches the UUID of the first country from the public country list endpoint.
 * The sign-up DTO requires a country UUID, not an alpha-2 code.
 */
export async function getCountryId(api: APIRequestContext): Promise<string> {
  const res = await api.get(`${API_URL}/api/v1/shared/country/list-public`, {
    headers: { "x-api-key": API_KEY },
  });
  if (!res.ok()) throw new Error(`getCountryId failed: ${await res.text()}`);
  const body = await res.json();
  const first = body.data?.[0];
  if (!first?.id) throw new Error("No countries returned from list-public");
  return first.id as string;
}

export async function signUpUser(
  api: APIRequestContext,
  overrides: Partial<TestUser> = {},
  options: { skipEmailConfirmation?: boolean } = {},
): Promise<TestUser> {
  const ts = Date.now();
  const user: TestUser = {
    email: overrides.email ?? `e2e.${ts}@test.eccho.dev`,
    password: overrides.password ?? `E2ePass${ts}!`,
    name: overrides.name ?? `E2E User ${ts}`,
    userId: "",
  };

  const countryId = await getCountryId(api);

  const res = await api.post(`${API_URL}/api/v1/public/auth/sign-up`, {
    headers: { "x-api-key": API_KEY },
    data: {
      email: user.email,
      password: user.password,
      name: user.name,
      country: countryId,
      // Any non-empty token passes Cloudflare's always-pass test secret;
      // ignored entirely when TURNSTILE_SECRET_KEY is unset.
      turnstileToken: "e2e",
    },
  });
  if (!res.ok()) throw new Error(`signUp failed: ${await res.text()}`);
  const body = await res.json();
  user.userId = body.data.userId;

  // Bypass Resend email restriction in E2E: confirm email directly via test helper
  if (!options.skipEmailConfirmation) {
    const confirmRes = await api.post(
      `${API_URL}/api/v1/test-helpers/confirm-email/${user.userId}`,
      { headers: { "x-api-key": API_KEY, "x-test-key": TEST_KEY } },
    );
    if (!confirmRes.ok())
      throw new Error(`confirmEmail failed: ${await confirmRes.text()}`);
  }

  return user;
}

/**
 * No-op unless the app was built with VITE_TURNSTILE_SITE_KEY. When it was, the
 * widget must issue its token before submit or the API rejects the request.
 */
export async function waitForTurnstile(page: Page): Promise<void> {
  const token = page.locator('input[name="cf-turnstile-response"]');
  if (await token.count()) {
    await expect(token).not.toHaveValue("", { timeout: 10_000 });
  }
}

export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.locator('input[autocomplete="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await waitForTurnstile(page);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard|\/$/);
}
