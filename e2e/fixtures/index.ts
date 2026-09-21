// e2e/fixtures/index.ts
import { test as base, APIRequestContext, Page } from "@playwright/test";
import { TestHelpersClient } from "./helpers.fixture";
import {
  API_URL,
  API_KEY,
  SEED_USER_EMAIL,
  SEED_USER_PASSWORD,
} from "../config";

type E2EFixtures = {
  api: APIRequestContext;
  helpers: TestHelpersClient;
  authedPage: {
    page: Page;
    accessToken: string;
    workspaceId: string;
    workspaceSlug: string;
  };
};

export const test = base.extend<E2EFixtures>({
  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext();
    await use(ctx);
    await ctx.dispose();
  },

  helpers: async ({ api }, use) => {
    await use(new TestHelpersClient(api));
  },

  authedPage: async ({ page, api }, use) => {
    // 1. Auth via a pre-seeded, already-verified account — skips sign-up +
    //    email confirmation (seed:user, run by migrate:seed:e2e).
    const loginRes = await api.post(
      `${API_URL}/api/v1/public/auth/login/credential`,
      {
        headers: { "x-api-key": API_KEY },
        data: { email: SEED_USER_EMAIL, password: SEED_USER_PASSWORD },
      },
    );
    if (!loginRes.ok()) {
      throw new Error(
        `Seeded login failed (${loginRes.status()}): ${await loginRes.text()} — ` +
          `did you run \`pnpm migrate:seed:e2e\` (seeds ${SEED_USER_EMAIL})?`,
      );
    }
    const accessToken: string = (await loginRes.json()).data.accessToken;

    // 2. Fresh workspace per test (FileInterceptor → multipart). Navigate by slug
    //    so a stale workspaces[0] on the shared account can't hide this chatbot.
    const wsRes = await api.post(`${API_URL}/api/v1/workspace/create`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      multipart: { name: `E2E Workspace ${Date.now()}` },
    });
    if (!wsRes.ok())
      throw new Error(
        `Workspace create failed: ${wsRes.status()} ${await wsRes.text()}`,
      );
    const wsData = (await wsRes.json()).data;
    const workspaceId: string = wsData.id;
    const workspaceSlug: string = wsData.slug;

    // 3. Inject the access token so the browser is authenticated without the login
    //    UI. atomWithStorage(TOKEN_STORAGE_KEY='auth-token') reads localStorage on
    //    boot; addInitScript runs before app scripts on every navigation. A fresh
    //    token won't 401, so no refresh-cookie dependency in the browser.
    await page.addInitScript(
      (token) => localStorage.setItem("auth-token", JSON.stringify(token)),
      accessToken,
    );

    await use({ page, accessToken, workspaceId, workspaceSlug });
  },
});

export { expect } from "@playwright/test";
