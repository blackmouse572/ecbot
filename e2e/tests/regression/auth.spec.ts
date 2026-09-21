// e2e/tests/regression/auth.spec.ts
import { test, expect } from "../../fixtures/index";
import { signUpUser, waitForTurnstile } from "../../fixtures/auth.fixture";
import { API_URL, API_KEY } from "../../config";

test.describe("Auth flows", () => {
  test("sign-up → confirm email → login → dashboard", async ({ page, api }) => {
    // signUpUser confirms email internally
    const user = await signUpUser(api);

    await page.goto("/login");
    await page.locator('input[autocomplete="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await waitForTurnstile(page);
    await page.getByRole("button", { name: /sign in/i }).click();

    // New users land on /onboard before /dashboard — accept both
    await expect(page).toHaveURL(/dashboard|onboard/);
  });

  test("login with wrong password shows error", async ({ page, api }) => {
    // signUpUser confirms email internally
    const user = await signUpUser(api);

    await page.goto("/login");
    await page.locator('input[autocomplete="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill("WrongPass999!");
    await waitForTurnstile(page);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByText(/incorrect|invalid.*password|wrong.*password/i).first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test("login without email verification shows error", async ({
    page,
    api,
  }) => {
    // Sign up but do NOT confirm email
    const user = await signUpUser(api, {}, { skipEmailConfirmation: true });

    await page.goto("/login");
    await page.locator('input[autocomplete="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await waitForTurnstile(page);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Stay on /login = login was rejected
    await expect(page).toHaveURL(/login/);
    // Toast with the translated API error "Email not verified."
    await expect(
      page
        .getByText(/email.*not.*verif|not.*verif.*email|email not verified/i)
        .first(),
    ).toBeVisible();
  });

  test("forgot password → reset → login with new password", async ({
    page,
    api,
    helpers,
  }) => {
    // signUpUser confirms email internally
    const user = await signUpUser(api);

    // Request password reset via API directly
    const resetRes = await api.post(
      `${API_URL}/api/v1/public/reset-password/request`,
      {
        headers: { "x-api-key": API_KEY },
        data: { email: user.email },
      },
    );
    if (!resetRes.ok())
      throw new Error(
        `reset request failed: ${resetRes.status()} ${await resetRes.text()}`,
      );

    // Retrieve both token (URL param) and otp (body) from test-helpers
    const resetInfo = await helpers.getResetToken(user.email);
    const newPassword = `NewPass${Date.now()}!`;

    // Step 1: verify OTP — token is the URL param, otp is the separate 6-char code
    const verifyRes = await api.post(
      `${API_URL}/api/v1/public/reset-password/verify/${resetInfo.token}`,
      {
        headers: { "x-api-key": API_KEY },
        data: { otp: resetInfo.otp },
      },
    );
    if (!verifyRes.ok())
      throw new Error(
        `verify failed: ${verifyRes.status()} ${await verifyRes.text()}`,
      );

    // Step 2: reset with new password using the same token
    const resetFinalRes = await api.post(
      `${API_URL}/api/v1/public/reset-password/reset/${resetInfo.token}`,
      {
        headers: { "x-api-key": API_KEY },
        data: { newPassword },
      },
    );
    if (!resetFinalRes.ok())
      throw new Error(
        `reset final failed: ${resetFinalRes.status()} ${await resetFinalRes.text()}`,
      );

    // Login with new password
    await page.goto("/login");
    await page.locator('input[autocomplete="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(newPassword);
    await waitForTurnstile(page);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard|onboard/);
  });
});
