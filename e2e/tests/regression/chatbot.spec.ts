// e2e/tests/regression/chatbot.spec.ts
import { test, expect } from "../../fixtures/index";
import { createChatbot, deleteChatbot } from "../../fixtures/chatbot.fixture";

test.describe("Chatbot management", () => {
  test("create chatbot appears in list", async ({ authedPage, api }) => {
    const { page, accessToken, workspaceId } = authedPage;
    const botName = `Bot ${Date.now()}`;

    await page.goto("/chatbot");
    await page.getByRole("button", { name: /create|new chatbot/i }).click();
    await page.getByLabel(/name/i).fill(botName);
    await page.getByRole("button", { name: /create|save/i }).click();

    await expect(page.getByText(botName)).toBeVisible();
  });

  test("edit chatbot name persists", async ({ authedPage, api }) => {
    const { page, accessToken, workspaceId } = authedPage;
    const newName = `Renamed ${Date.now()}`;

    await createChatbot(api, accessToken, workspaceId, `EditMe ${Date.now()}`);

    await page.goto("/chatbot");
    await page.getByRole("link").filter({ hasText: /bot/i }).first().click();
    await page.getByRole("button", { name: /edit|settings/i }).click();
    await page.getByLabel(/name/i).clear();
    await page.getByLabel(/name/i).fill(newName);
    await page.getByRole("button", { name: /save|update/i }).click();

    await expect(page.getByText(newName)).toBeVisible();
  });

  test("delete chatbot removes it from list", async ({ authedPage, api }) => {
    const { page, accessToken, workspaceId } = authedPage;
    const botName = `DeleteMe ${Date.now()}`;
    await createChatbot(api, accessToken, workspaceId, botName);

    await page.goto("/chatbot");
    // Locate the chatbot row and delete it
    const row = page.getByText(botName).first().locator("..");
    await row.getByRole("button", { name: /delete|remove/i }).click();
    await page.getByRole("button", { name: /confirm|yes/i }).click();

    await expect(page.getByText(botName)).not.toBeVisible({ timeout: 5000 });
  });
});
