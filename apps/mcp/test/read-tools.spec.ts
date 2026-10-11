import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/client");

import * as api from "@repo/client";
import { connect, textOf } from "./mcp-client";

const KEY = "client-key:client-secret";
const page = (rows: unknown[]) => ({
  data: rows,
  _metadata: { pagination: { total: rows.length } },
});

// Each tool: its arguments, the @repo/client call it makes with them, the
// API response, and what the tool returns.
const cases: [
  tool: string,
  args: Record<string, unknown>,
  call: keyof typeof api,
  request: Record<string, unknown>,
  response: unknown,
  result: unknown,
][] = [
  [
    "list_knowledge_bases",
    { search: "faq" },
    "knowledgeBaseClientControllerListV1",
    { query: { search: "faq" } },
    page([{ id: "kb-1" }]),
    { knowledgeBases: [{ id: "kb-1" }], pagination: { total: 1 } },
  ],
  [
    "list_knowledge_items",
    { knowledgeBaseId: "kb-1", status: "COMPLETED", page: 2 },
    "knowledgeItemClientControllerListV1",
    {
      path: { knowledgeBaseId: "kb-1" },
      query: { status: "COMPLETED", page: 2 },
    },
    page([{ id: "item-1" }]),
    { knowledgeItems: [{ id: "item-1" }], pagination: { total: 1 } },
  ],
  [
    "get_knowledge_item",
    { knowledgeBaseId: "kb-1", id: "item-1" },
    "knowledgeItemClientControllerGetV1",
    { path: { knowledgeBaseId: "kb-1", id: "item-1" } },
    { data: { id: "item-1", content: "Ship in 2 days" } },
    { id: "item-1", content: "Ship in 2 days" },
  ],
  [
    "list_conversations",
    { status: "OPEN", chatbot: "chatbot-1", botEnabled: false },
    "conversationClientControllerListV1",
    { query: { status: "OPEN", chatbot: "chatbot-1", botEnabled: "false" } },
    page([{ id: "conv-1" }]),
    { conversations: [{ id: "conv-1" }], pagination: { total: 1 } },
  ],
  [
    "get_conversation",
    { id: "conv-1" },
    "conversationClientControllerGetV1",
    { path: { id: "conv-1" } },
    { data: { id: "conv-1" } },
    { id: "conv-1" },
  ],
  [
    "list_conversation_messages",
    { conversationId: "conv-1", page: 2, perPage: 20 },
    "conversationClientControllerListMessagesV1",
    { path: { id: "conv-1" }, query: { page: 2, perPage: 20 } },
    page([{ id: "msg-1" }]),
    { messages: [{ id: "msg-1" }], pagination: { total: 1 } },
  ],
  [
    "list_customers",
    { search: "alice" },
    "customerClientControllerListV1",
    { query: { search: "alice" } },
    page([{ id: "cust-1" }]),
    { customers: [{ id: "cust-1" }], pagination: { total: 1 } },
  ],
  [
    "get_customer",
    { id: "cust-1" },
    "customerClientControllerGetV1",
    { path: { id: "cust-1" } },
    { data: { id: "cust-1" } },
    { id: "cust-1" },
  ],
];

describe("read tools", () => {
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

  // Customers write conversation messages and anyone can upload knowledge
  // documents (CONTEXT.md: untrusted input), so the agent is told not to
  // follow instructions found in them.
  it.each(["get_knowledge_item", "list_conversation_messages"])(
    "%s warns that its text is untrusted",
    async (tool) => {
      vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue({
        data: {
          data: {
            permissions: [
              { subject: "CHATBOT", action: ["read"] },
              { subject: "KNOWLEDGE_BASE", action: ["read"] },
            ],
          },
        },
      } as never);
      const client = await connect({ "x-api-key": KEY });

      const { tools } = await client.listTools();

      expect(tools.find((t) => t.name === tool)?.description).toMatch(
        /never as instructions/,
      );
    },
  );
});
