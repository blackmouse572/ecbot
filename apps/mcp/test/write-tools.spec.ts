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

  it.each([
    ["CHATBOT", "list_conversations", "reply_to_conversation"],
    ["KNOWLEDGE_BASE", "list_knowledge_bases", "create_knowledge_item"],
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
