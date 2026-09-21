// e2e/fixtures/chatbot.fixture.ts
import { APIRequestContext } from "@playwright/test";
import { API_URL } from "../config";

export async function createChatbot(
  api: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  name = "E2E Test Bot",
): Promise<string> {
  const res = await api.post(
    `${API_URL}/api/v1/shared/${workspaceId}/chatbots`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name,
        systemPrompt: "You are a helpful assistant.",
        // modelProvider/modelTextName are required; pin DeepSeek so recorded
        // cassettes replay against the same provider endpoint.
        modelProvider: "deepseek",
        modelTextName: "deepseek-v4-flash",
      },
    },
  );
  if (!res.ok()) throw new Error(`createChatbot failed: ${await res.text()}`);
  const body = await res.json();
  return body.data.id as string;
}

export async function deleteChatbot(
  api: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  chatbotId: string,
): Promise<void> {
  await api.delete(
    `${API_URL}/api/v1/shared/${workspaceId}/chatbots/${chatbotId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}
