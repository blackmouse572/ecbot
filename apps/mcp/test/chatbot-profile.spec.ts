import {
  applyPreset,
  compileFollowupRules,
  createProfile,
} from "@repo/agent-blueprint";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/client");

import * as api from "@repo/client";
import { connect, textOf } from "./mcp-client";

const KEY = "client-key:client-secret";
const BOT = {
  name: "Mộc",
  type: "restaurant",
  primaryLanguage: "vi",
  modelTextName: "google/gemini-2.5-flash",
};

// The body the tool sent to the API.
function sent(call: keyof typeof api) {
  const [options] = vi.mocked(api[call] as (o: unknown) => unknown).mock
    .calls[0] as [{ body: Record<string, unknown> }];
  return options.body;
}

describe("chatbot profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.chatbotClientControllerCreateV1).mockResolvedValue({
      data: { data: { id: "bot-1" } },
    } as never);
    vi.mocked(api.chatbotClientControllerUpdateV1).mockResolvedValue({
      data: { data: { id: "bot-1" } },
    } as never);
  });

  it("gives a new chatbot its business type's preset, as the app does", async () => {
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({ name: "create_chatbot", arguments: BOT });

    const profile = { ...createProfile("restaurant", "vi"), agentName: "Mộc" };
    expect(sent("chatbotClientControllerCreateV1")).toMatchObject({
      agentProfile: profile,
      followupRules: compileFollowupRules(profile),
    });
  });

  it("writes the profile answers over the preset", async () => {
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({
      name: "create_chatbot",
      arguments: {
        ...BOT,
        profile: {
          businessName: "Mộc Quán",
          goals: ["answer_questions", "reservations"],
          addressStyle: "custom",
          customAddressStyle: { self: "Mộc", customer: "bạn" },
          facts: { address: "12 Bạch Đằng, Đà Nẵng" },
        },
      },
    });

    expect(sent("chatbotClientControllerCreateV1").agentProfile).toEqual({
      ...createProfile("restaurant", "vi"),
      agentName: "Mộc",
      businessName: "Mộc Quán",
      goals: ["answer_questions", "reservations"],
      addressStyle: "custom",
      customAddressStyle: { self: "Mộc", customer: "bạn" },
      facts: { address: "12 Bạch Đằng, Đà Nẵng" },
    });
  });

  it("lists the valid library ids in the tool schema", async () => {
    vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue(
      {} as never,
    );
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();
    const create = tools.find((t) => t.name === "create_chatbot")?.inputSchema;
    const profile = create?.properties?.profile as {
      properties: Record<string, { items?: { enum?: string[] } }>;
    };

    expect(profile.properties.rules.items?.enum).toContain(
      "no_invented_prices",
    );
    expect(create?.properties).not.toHaveProperty("generalKnowledge");
  });

  it("says what is wrong with a profile the schema rejects", async () => {
    const client = await connect({ "x-api-key": KEY });

    const output = await client.callTool({
      name: "create_chatbot",
      arguments: { ...BOT, profile: { addressStyle: "custom" } },
    });

    expect(output.isError).toBe(true);
    expect(textOf(output)).toContain("customAddressStyle");
    expect(api.chatbotClientControllerCreateV1).not.toHaveBeenCalled();
  });

  it("changes only the answers sent on update and keeps edited follow-up rules", async () => {
    const stored = { ...createProfile("restaurant", "vi"), agentName: "Mộc" };
    vi.mocked(api.chatbotClientControllerFindOneV1).mockResolvedValue({
      data: {
        data: { ...BOT, agentProfile: stored, followupRules: "Only VIPs." },
      },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({
      name: "update_chatbot",
      arguments: { chatbotId: "bot-1", profile: { emoji: false } },
    });

    expect(sent("chatbotClientControllerUpdateV1")).toEqual({
      agentProfile: { ...stored, emoji: false },
      followupRules: "Only VIPs.",
    });
  });

  it("moves the profile to the new preset when the type changes", async () => {
    const stored = { ...createProfile("restaurant", "vi"), agentName: "Mộc" };
    vi.mocked(api.chatbotClientControllerFindOneV1).mockResolvedValue({
      data: {
        data: {
          ...BOT,
          agentProfile: stored,
          followupRules: compileFollowupRules(stored),
        },
      },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({
      name: "update_chatbot",
      arguments: { chatbotId: "bot-1", type: "beauty" },
    });

    const profile = applyPreset(stored, "beauty");
    expect(sent("chatbotClientControllerUpdateV1")).toEqual({
      type: "beauty",
      agentProfile: profile,
      followupRules: compileFollowupRules(profile),
    });
  });

  it("leaves a chatbot without a profile alone unless one is sent", async () => {
    vi.mocked(api.chatbotClientControllerFindOneV1).mockResolvedValue({
      data: { data: { ...BOT, type: "spa", agentProfile: null } },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({
      name: "update_chatbot",
      arguments: { chatbotId: "bot-1", primaryLanguage: "en" },
    });

    expect(sent("chatbotClientControllerUpdateV1")).toEqual({
      primaryLanguage: "en",
    });
  });

  it("merges sent facts into the stored ones", async () => {
    const stored = {
      ...createProfile("restaurant", "vi"),
      facts: { address: "12 Bạch Đằng", menu_highlights: "Cua rang me" },
    };
    vi.mocked(api.chatbotClientControllerFindOneV1).mockResolvedValue({
      data: { data: { ...BOT, agentProfile: stored, followupRules: "" } },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({
      name: "update_chatbot",
      arguments: {
        chatbotId: "bot-1",
        profile: { facts: { opening_hours: "9:00 to 22:00" } },
      },
    });

    expect(sent("chatbotClientControllerUpdateV1").agentProfile).toMatchObject({
      facts: {
        address: "12 Bạch Đằng",
        menu_highlights: "Cua rang me",
        opening_hours: "9:00 to 22:00",
      },
    });
  });

  it("still creates a chatbot of a type without a preset, with no profile", async () => {
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({
      name: "create_chatbot",
      arguments: { ...BOT, type: "other" },
    });

    expect(sent("chatbotClientControllerCreateV1")).toEqual({
      ...BOT,
      type: "other",
    });
  });

  it("names the chatbot read permission when reading the profile fails", async () => {
    vi.mocked(api.chatbotClientControllerFindOneV1).mockResolvedValue({
      error: { message: "You do not have permission." },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    const output = await client.callTool({
      name: "update_chatbot",
      arguments: { chatbotId: "bot-1", profile: { emoji: false } },
    });

    expect(output.isError).toBe(true);
    expect(textOf(output)).toContain("chatbot read permission");
    expect(textOf(output)).toContain("You do not have permission.");
    expect(api.chatbotClientControllerUpdateV1).not.toHaveBeenCalled();
  });
});
