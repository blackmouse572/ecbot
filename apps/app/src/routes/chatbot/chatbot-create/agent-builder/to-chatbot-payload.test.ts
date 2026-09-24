import { createProfile } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import { toChatbotPayload } from "./to-chatbot-payload";

describe("toChatbotPayload", () => {
  const profile = { ...createProfile("beauty", "vi"), businessName: "Lotus", agentName: "Linh", greeting: "Chào bạn!" };

  it("maps builder answers onto a full create payload", () => {
    const body = toChatbotPayload(profile, "Closed Mondays");
    expect(body).toMatchObject({
      name: "Linh", type: "beauty", primaryLanguage: "vi", deferedLanguage: "vi",
      welcomeMessage: "Chào bạn!", agentProfile: profile, extraInstructions: "Closed Mondays",
      autoRead: true, typingIndicator: true, accounts: [],
    });
    expect(body.modelTextName).toBeTruthy();
  });

  it("keeps fields the builder does not own when a base is given", () => {
    const body = toChatbotPayload(profile, "", { accounts: ["a1"], guardrailEnabled: true, modelTextName: "openai/gpt-5.4" } as never);
    expect(body.accounts).toEqual(["a1"]);
    expect(body.guardrailEnabled).toBe(true);
    expect(body.modelTextName).toBe("openai/gpt-5.4");
  });

  it("falls back to the business name, then a default name", () => {
    expect(toChatbotPayload({ ...profile, agentName: "" }, "").name).toBe("Lotus");
    expect(toChatbotPayload({ ...profile, agentName: "", businessName: "" }, "").name).toBe("Agent");
  });

  it("keeps the chatbot's existing name, falling back to the builder's name", () => {
    expect(toChatbotPayload(profile, "", { name: "Front desk bot" } as never).name).toBe("Front desk bot");
    expect(toChatbotPayload(profile, "").name).toBe("Linh");
  });

  it("keeps the chatbot's existing primary language, falling back to the builder's language", () => {
    expect(toChatbotPayload(profile, "", { primaryLanguage: "en" } as never).primaryLanguage).toBe("en");
    expect(toChatbotPayload(profile, "").primaryLanguage).toBe("vi");
  });

  it("keeps the chatbot's welcome message unless the builder has a greeting", () => {
    const base = { welcomeMessage: "Hi from settings" } as never;
    expect(toChatbotPayload({ ...profile, greeting: "  " }, "", base).welcomeMessage).toBe("Hi from settings");
    expect(toChatbotPayload(profile, "", base).welcomeMessage).toBe("Chào bạn!");
    expect(toChatbotPayload({ ...profile, greeting: "" }, "").welcomeMessage).toBe("");
  });

  it("keeps the chatbot's existing fallback language, defaulting to the primary language when there is none", () => {
    expect(toChatbotPayload(profile, "", { deferedLanguage: "en" } as never).deferedLanguage).toBe("en");
    expect(toChatbotPayload(profile, "").deferedLanguage).toBe("vi");
  });
});
