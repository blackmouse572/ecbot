// e2e/tests/regression/chat-conversation.spec.ts
import fs from "fs";
import path from "path";
import { test, expect } from "../../fixtures/index";
import { createChatbot, deleteChatbot } from "../../fixtures/chatbot.fixture";

const CASSETTES_DIR = path.resolve(__dirname, "../../../cassettes");

const hasCassettes =
  fs.existsSync(CASSETTES_DIR) &&
  fs.readdirSync(CASSETTES_DIR).some((f) => f.endsWith(".yaml"));

test.describe("Chat conversation — cassette replay", () => {
  let chatbotId: string;

  test.skip(!hasCassettes, "No cassettes recorded yet — run record step first");

  test.beforeEach(async ({ authedPage, api }) => {
    const { accessToken, workspaceId } = authedPage;
    chatbotId = await createChatbot(
      api,
      accessToken,
      workspaceId,
      "Regression Bot",
    );
  });

  test.afterEach(async ({ authedPage, api }) => {
    const { accessToken, workspaceId } = authedPage;
    await deleteChatbot(api, accessToken, workspaceId, chatbotId);
  });

  test("send message → response visible (cassette)", async ({ authedPage }) => {
    const { page, workspaceSlug } = authedPage;

    await page.goto(`/${workspaceSlug}/chatbot/${chatbotId}`);
    const input = page.getByRole("textbox", { name: /message|chat/i });
    await input.fill("Hello, who are you?");
    await input.press("Enter");

    // With cassette replay, response arrives quickly
    const responseArea = page.locator('[data-testid="chat-message"]').last();
    await expect(responseArea).not.toBeEmpty({ timeout: 15_000 });
    // Do not assert exact text — cassette content may vary between AI providers
    // Assert structure only: response exists and has readable content
    const text = await responseArea.textContent();
    expect(text?.trim().length).toBeGreaterThan(5);
  });
});
