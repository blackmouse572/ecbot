import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/client");

import * as api from "@repo/client";
import { connect, textOf } from "./mcp-client";

const KEY = "client-key:client-secret";

// Annotations by kind of change: a tool that only adds, or flips a
// reversible switch, is not destructive; one that overwrites or deletes is.
const ADDS = { readOnlyHint: false, destructiveHint: false };
const SWITCHES = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
};
const DELETES = { readOnlyHint: false, destructiveHint: true };
const OVERWRITES = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
};

// Each tool: its arguments, the @repo/client call it makes with them, the
// API response, what the tool returns, and its annotations.
const cases: [
  tool: string,
  args: Record<string, unknown>,
  call: keyof typeof api,
  request: Record<string, unknown>,
  response: unknown,
  result: unknown,
  annotations: Record<string, boolean>,
][] = [
  [
    "reply_to_conversation",
    { conversationId: "conv-1", text: "Hi, how can I help?" },
    "conversationClientControllerSendMessageV1",
    { path: { id: "conv-1" }, body: { text: "Hi, how can I help?" } },
    { data: { id: "msg-1" } },
    { id: "msg-1" },
    // Additive, but the customer sees it at once on another platform.
    { ...ADDS, openWorldHint: true },
  ],
  [
    "set_conversation_bot",
    { conversationId: "conv-1", botEnabled: false, reason: "VIP" },
    "conversationClientControllerUpdateBotV1",
    { path: { id: "conv-1" }, body: { botEnabled: false, reason: "VIP" } },
    { data: { id: "conv-1", botEnabled: false } },
    { id: "conv-1", botEnabled: false },
    SWITCHES,
  ],
  [
    "set_conversation_status",
    { conversationId: "conv-1", status: "RESOLVED" },
    "conversationClientControllerUpdateStatusV1",
    { path: { id: "conv-1" }, body: { status: "RESOLVED" } },
    { data: { id: "conv-1", status: "RESOLVED" } },
    { id: "conv-1", status: "RESOLVED" },
    SWITCHES,
  ],
  [
    "create_knowledge_base",
    { name: "FAQ", description: "Common questions" },
    "knowledgeBaseClientControllerCreateV1",
    { body: { name: "FAQ", description: "Common questions" } },
    { data: { id: "kb-1" } },
    { id: "kb-1" },
    ADDS,
  ],
  [
    "update_knowledge_base",
    { knowledgeBaseId: "kb-1", name: "Support FAQ" },
    "knowledgeBaseClientControllerUpdateV1",
    { path: { knowledgeBaseId: "kb-1" }, body: { name: "Support FAQ" } },
    { data: { id: "kb-1", name: "Support FAQ" } },
    { id: "kb-1", name: "Support FAQ" },
    OVERWRITES,
  ],
  [
    "create_knowledge_item",
    {
      knowledgeBaseId: "kb-1",
      type: "TEXT",
      title: "Opening hours",
      content: "Open 9am to 5pm, Monday to Saturday.",
    },
    "knowledgeItemClientControllerCreateV1",
    {
      path: { knowledgeBaseId: "kb-1" },
      body: {
        type: "TEXT",
        title: "Opening hours",
        content: "Open 9am to 5pm, Monday to Saturday.",
      },
    },
    { data: { id: "item-1", status: "DRAFT" } },
    { id: "item-1", status: "DRAFT" },
    ADDS,
  ],
  [
    "update_knowledge_item",
    { knowledgeBaseId: "kb-1", itemId: "item-1", content: "Open 8am to 6pm." },
    "knowledgeItemClientControllerUpdateV1",
    {
      path: { knowledgeBaseId: "kb-1", id: "item-1" },
      body: { content: "Open 8am to 6pm." },
    },
    { data: { id: "item-1" } },
    { id: "item-1" },
    OVERWRITES,
  ],
  [
    "process_knowledge_item",
    { knowledgeBaseId: "kb-1", itemId: "item-1" },
    "knowledgeItemClientControllerUpdateV1",
    {
      path: { knowledgeBaseId: "kb-1", id: "item-1" },
      body: { status: "READY" },
    },
    { data: { id: "item-1", status: "READY" } },
    { id: "item-1", status: "READY" },
    SWITCHES,
  ],
  [
    "delete_knowledge_item",
    { knowledgeBaseId: "kb-1", itemId: "item-1" },
    "knowledgeItemClientControllerDeleteV1",
    { path: { knowledgeBaseId: "kb-1", id: "item-1" } },
    { data: { id: "item-1" } },
    { id: "item-1" },
    DELETES,
  ],
  [
    "update_customer",
    { customerId: "cust-1", notes: "Prefers Zalo" },
    "customerClientControllerUpdateV1",
    { path: { id: "cust-1" }, body: { notes: "Prefers Zalo" } },
    { data: { id: "cust-1" } },
    { id: "cust-1" },
    OVERWRITES,
  ],
  [
    "create_customer_tag",
    { name: "VIP", emoji: "⭐" },
    "customerTagClientControllerCreateV1",
    { body: { name: "VIP", emoji: "⭐" } },
    { data: { id: "tag-1" } },
    { id: "tag-1" },
    ADDS,
  ],
  [
    "update_customer_tag",
    { tagId: "tag-1", name: "Gold" },
    "customerTagClientControllerUpdateV1",
    { path: { customerTag: "tag-1" }, body: { name: "Gold" } },
    { data: { id: "tag-1" } },
    { id: "tag-1" },
    OVERWRITES,
  ],
  [
    "delete_customer_tag",
    { tagId: "tag-1" },
    "customerTagClientControllerDeleteV1",
    { path: { customerTag: "tag-1" } },
    "",
    { deleted: "tag-1" },
    DELETES,
  ],
  [
    "tag_customer",
    { customerId: "cust-1", tagId: "tag-1" },
    "customerTagAssignmentClientControllerApplyV1",
    { path: { customerId: "cust-1", tagId: "tag-1" } },
    { data: { id: "a-1" } },
    { id: "a-1" },
    SWITCHES,
  ],
  [
    "untag_customer",
    { customerId: "cust-1", tagId: "tag-1" },
    "customerTagAssignmentClientControllerRemoveV1",
    { path: { customerId: "cust-1", tagId: "tag-1" } },
    "",
    { removed: "tag-1" },
    SWITCHES,
  ],
  [
    "create_chatbot",
    {
      name: "Shop bot",
      type: "restaurant",
      primaryLanguage: "vi",
      modelTextName: "google/gemini-2.5-flash",
    },
    "chatbotClientControllerCreateV1",
    {
      body: {
        name: "Shop bot",
        type: "restaurant",
        primaryLanguage: "vi",
        modelTextName: "google/gemini-2.5-flash",
      },
    },
    { data: { id: "bot-1" } },
    { id: "bot-1" },
    ADDS,
  ],
  [
    "update_chatbot",
    { chatbotId: "bot-1", welcomeMessage: "Xin chào!" },
    "chatbotClientControllerUpdateV1",
    { path: { id: "bot-1" }, body: { welcomeMessage: "Xin chào!" } },
    { data: { id: "bot-1" } },
    { id: "bot-1" },
    OVERWRITES,
  ],
  [
    "activate_chatbot",
    { chatbotId: "bot-1" },
    "chatbotClientControllerActiveV1",
    { path: { id: "bot-1" } },
    { data: { id: "bot-1" } },
    { id: "bot-1" },
    SWITCHES,
  ],
  [
    "deactivate_chatbot",
    { chatbotId: "bot-1" },
    "chatbotClientControllerInactiveV1",
    { path: { id: "bot-1" } },
    { data: { id: "bot-1" } },
    { id: "bot-1" },
    SWITCHES,
  ],
  [
    "delete_chatbot",
    { chatbotId: "bot-1" },
    "chatbotClientControllerDeleteV1",
    { path: { id: "bot-1" } },
    { data: { id: "bot-1" } },
    { id: "bot-1" },
    DELETES,
  ],
  [
    "create_http_tool",
    {
      name: "lookup_order",
      description: "Look up an order by its code.",
      httpMethod: "GET",
      httpUrl: "https://shop.example/orders/{code}",
      inputSchema: { type: "object", properties: { code: { type: "string" } } },
    },
    "toolClientControllerCreateHttpV1",
    {
      body: {
        name: "lookup_order",
        description: "Look up an order by its code.",
        httpMethod: "GET",
        httpUrl: "https://shop.example/orders/{code}",
        inputSchema: {
          type: "object",
          properties: { code: { type: "string" } },
        },
      },
    },
    { data: { id: "tool-1" } },
    { id: "tool-1" },
    ADDS,
  ],
  [
    "create_mcp_tool",
    {
      name: "crm",
      description: "The shop's CRM.",
      serverUrl: "https://crm.example/mcp",
    },
    "toolClientControllerCreateMcpV1",
    {
      body: {
        name: "crm",
        description: "The shop's CRM.",
        serverUrl: "https://crm.example/mcp",
      },
    },
    { data: { id: "tool-2" } },
    { id: "tool-2" },
    ADDS,
  ],
  [
    "update_workspace_tool",
    { toolId: "tool-1", description: "Find an order." },
    "toolClientControllerUpdateV1",
    { path: { toolId: "tool-1" }, body: { description: "Find an order." } },
    { data: { id: "tool-1" } },
    { id: "tool-1" },
    OVERWRITES,
  ],
  [
    "delete_workspace_tool",
    { toolId: "tool-1" },
    "toolClientControllerDeleteV1",
    { path: { toolId: "tool-1" } },
    { data: { id: "tool-1" } },
    { id: "tool-1" },
    DELETES,
  ],
  [
    "enable_chatbot_tool",
    { chatbotId: "bot-1", toolId: "tool-1" },
    "chatbotToolClientControllerEnableV1",
    { path: { chatbotId: "bot-1", toolId: "tool-1" }, body: {} },
    { data: { id: "ct-1" } },
    { id: "ct-1" },
    SWITCHES,
  ],
  [
    "disable_chatbot_tool",
    { chatbotId: "bot-1", toolId: "tool-1" },
    "chatbotToolClientControllerDisableV1",
    { path: { chatbotId: "bot-1", toolId: "tool-1" } },
    { data: { id: "tool-1" } },
    { id: "tool-1" },
    SWITCHES,
  ],
  [
    "create_skill",
    {
      name: "Refunds",
      instructions: "Apologize, then ask for the order code.",
    },
    "skillClientControllerCreateV1",
    {
      body: {
        name: "Refunds",
        instructions: "Apologize, then ask for the order code.",
      },
    },
    { data: { id: "skill-1" } },
    { id: "skill-1" },
    ADDS,
  ],
  [
    "create_skill",
    {
      name: "Order tracking",
      format: "STEPS",
      guardrails: ["Never share another customer's order."],
      steps: [
        { id: "s1", type: "ask", text: "The order code" },
        { id: "s2", type: "tool", toolId: "tool-1" },
      ],
    },
    "skillClientControllerCreateV1",
    {
      body: {
        name: "Order tracking",
        format: "STEPS",
        guardrails: ["Never share another customer's order."],
        steps: [
          { id: "s1", type: "ask", text: "The order code" },
          { id: "s2", type: "tool", toolId: "tool-1" },
        ],
      },
    },
    { data: { id: "skill-3" } },
    { id: "skill-3" },
    ADDS,
  ],
  [
    "clone_skill_template",
    { templateId: "tpl-1" },
    "skillClientControllerCloneV1",
    { path: { skillId: "tpl-1" } },
    { data: { id: "skill-2" } },
    { id: "skill-2" },
    ADDS,
  ],
  [
    "update_skill",
    { skillId: "skill-1", instructions: "Offer store credit first." },
    "skillClientControllerUpdateV1",
    {
      path: { skillId: "skill-1" },
      body: { instructions: "Offer store credit first." },
    },
    { data: { id: "skill-1" } },
    { id: "skill-1" },
    OVERWRITES,
  ],
  [
    "delete_skill",
    { skillId: "skill-1" },
    "skillClientControllerDeleteV1",
    { path: { skillId: "skill-1" } },
    { data: { id: "skill-1" } },
    { id: "skill-1" },
    DELETES,
  ],
  [
    "attach_skill",
    { chatbotId: "bot-1", skillId: "skill-1" },
    "chatbotSkillClientControllerAttachV1",
    { path: { chatbotId: "bot-1", skillId: "skill-1" }, body: {} },
    { data: { id: "cs-1" } },
    { id: "cs-1" },
    SWITCHES,
  ],
  [
    "detach_skill",
    { chatbotId: "bot-1", skillId: "skill-1" },
    "chatbotSkillClientControllerDetachV1",
    { path: { chatbotId: "bot-1", skillId: "skill-1" } },
    { data: { id: "skill-1" } },
    { id: "skill-1" },
    SWITCHES,
  ],
];

describe("write tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(cases)(
    "%s calls the API with the caller's key",
    async (tool, args, call, request, response, result) => {
      vi.mocked(api[call] as () => unknown).mockResolvedValue({
        data: response,
      });
      const client = await connect({ "x-api-key": KEY });

      const output = await client.callTool({ name: tool, arguments: args });

      expect(api[call]).toHaveBeenCalledWith(
        expect.objectContaining({ auth: KEY, ...request }),
      );
      expect(output.isError).toBeFalsy();
      expect(JSON.parse(textOf(output))).toEqual(result);
    },
  );

  it.each(cases)(
    "%s says what kind of change it makes",
    async (tool, _args, _call, _request, _response, _result, annotations) => {
      // No answer from the permission lookup lists every tool.
      vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue(
        {} as never,
      );
      const client = await connect({ "x-api-key": KEY });

      const { tools } = await client.listTools();

      expect(tools.find((t) => t.name === tool)?.annotations).toEqual(
        annotations,
      );
    },
  );

  it("steers workflows out of a chatbot's extra instructions into skills", async () => {
    vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue(
      {} as never,
    );
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();
    const extra = tools.find((t) => t.name === "update_chatbot")?.inputSchema
      .properties?.extraInstructions as { description?: string };

    expect(extra.description).toContain("Skill");
  });

  it("tells the caller which built-in actions a skill's Tool step can use", async () => {
    vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue(
      {} as never,
    );
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();
    const steps = tools.find((t) => t.name === "create_skill")?.inputSchema
      .properties?.steps as { description?: string };

    for (const id of [
      "system:handoff",
      "system:notify_team",
      "system:add_tag",
      "system:remove_tag",
      "system:schedule_followup",
      "system:save_customer_field",
    ])
      expect(steps.description).toContain(id);
  });

  it.each([
    ["CHATBOT", "list_conversations", "reply_to_conversation"],
    ["KNOWLEDGE_BASE", "list_knowledge_bases", "create_knowledge_item"],
    ["CUSTOMER", "list_customer_tags", "update_customer"],
    ["TOOL", "list_workspace_tools", "create_http_tool"],
    ["SKILL", "list_skills", "create_skill"],
  ])(
    "hides %s writes from a key that may only read them",
    async (subject, readTool, writeTool) => {
      vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue({
        data: { data: { permissions: [{ subject, action: ["read"] }] } },
      } as never);
      const client = await connect({ "x-api-key": KEY });

      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain(readTool);
      expect(names).not.toContain(writeTool);
    },
  );
});
