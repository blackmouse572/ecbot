// e2e/tests/smoke/chat-flow.smoke.ts
// @smoke — runs only in smoke project (real LLM)
import { test, expect } from "../../fixtures/index";
import { createChatbot, deleteChatbot } from "../../fixtures/chatbot.fixture";

test.describe("@smoke Chat flow — real AI", () => {
  let chatbotId: string;

  test.beforeEach(async ({ authedPage, api }) => {
    const { accessToken, workspaceId } = authedPage;
    chatbotId = await createChatbot(api, accessToken, workspaceId, "Smoke Bot");
  });

  test.afterEach(async ({ authedPage, api }) => {
    const { accessToken, workspaceId } = authedPage;
    await deleteChatbot(api, accessToken, workspaceId, chatbotId);
  });

  test("send message → AI responds with non-empty text", async ({
    authedPage,
  }) => {
    const { page, workspaceSlug } = authedPage;

    await page.goto(`/${workspaceSlug}/chatbot/${chatbotId}`);
    const input = page.getByRole("textbox", { name: /message|chat/i });
    await input.fill("Hello, who are you?");
    await input.press("Enter");

    // Wait for streaming response to complete (no spinner, text visible)
    const responseArea = page.locator('[data-testid="chat-message"]').last();
    await expect(responseArea).not.toBeEmpty({ timeout: 30_000 });

    const text = await responseArea.textContent();
    expect(text?.trim().length).toBeGreaterThan(10);
  });
});
