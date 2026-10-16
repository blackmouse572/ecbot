import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/client");

import {
  chatbotClientControllerFindAllV1,
  chatbotClientControllerFindOneV1,
  clientCredentialClientControllerMeV1,
} from "@repo/client";
import { app } from "../src/index";
import { connect, textOf } from "./mcp-client";

const KEY = "client-key:client-secret";

const findAll = vi.mocked(chatbotClientControllerFindAllV1);
const findOne = vi.mocked(chatbotClientControllerFindOneV1);
const me = vi.mocked(clientCredentialClientControllerMeV1);

const READ_TOOLS = [
  "get_chatbot",
  "get_conversation",
  "get_customer",
  "get_customer_tags",
  "get_knowledge_item",
  "get_skill",
  "get_workspace_tool",
  "list_chatbot_knowledge",
  "list_chatbot_models",
  "list_chatbot_skills",
  "list_chatbot_tools",
  "list_chatbots",
  "list_conversation_messages",
  "list_conversations",
  "list_customer_tags",
  "list_customers",
  "list_knowledge_bases",
  "list_knowledge_items",
  "list_skills",
  "list_workspace_tools",
];

// What GET /client/v1/me answers: the key's permissions in its workspace.
function permits(permissions: { subject: string; action: string[] }[]) {
  me.mockResolvedValue({
    data: { data: { workspaceId: "workspace-1", permissions } },
  } as never);
}

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});

describe("/mcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a request without a client credential", async () => {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

    expect(res.status).toBe(401);
  });

  // MCP servers must validate Origin against DNS rebinding. No browser
  // origin is allowed; MCP clients (Claude Code, Codex) send none.
  it("rejects a request from a browser origin", async () => {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        origin: "https://evil.example",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

    expect(res.status).toBe(403);
  });

  // Clients still on the 2025 protocol get the stateless fallback.
  it("answers a 2025-era initialize", async () => {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "x-api-key": KEY,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "legacy-client", version: "1.0.0" },
        },
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('"name":"ecbot"');
  });

  it("lists every tool as read-only to a key that may read everything", async () => {
    permits([
      { subject: "CHATBOT", action: ["read"] },
      { subject: "KNOWLEDGE_BASE", action: ["read"] },
      { subject: "CUSTOMER", action: ["read"] },
      { subject: "TOOL", action: ["read"] },
      { subject: "SKILL", action: ["read"] },
    ]);
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual(READ_TOOLS);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  // The agent sees only what will succeed. The API still checks every call.
  it("lists only the tools the key's permissions allow", async () => {
    permits([{ subject: "CUSTOMER", action: ["read"] }]);
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_customer",
      "get_customer_tags",
      "list_customer_tags",
      "list_customers",
    ]);
    expect(me).toHaveBeenCalledTimes(1);
    expect(me).toHaveBeenCalledWith(
      expect.objectContaining({ auth: KEY, adapter: "fetch" }),
    );
  });

  it("lists no tools to a key whose creator left the workspace", async () => {
    permits([]);
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();

    expect(tools).toEqual([]);
  });

  // A wrong key or an API outage: each call then reports the API's error.
  it("lists every tool when the API can't say what the key may do", async () => {
    const subjects = ["CHATBOT", "KNOWLEDGE_BASE", "CUSTOMER", "TOOL", "SKILL"];
    const actions = ["manage", "read", "create", "update", "delete"];
    permits(subjects.map((subject) => ({ subject, action: actions })));
    const everything = await connect({ "x-api-key": KEY })
      .then((client) => client.listTools())
      .then(({ tools }) => tools.map((tool) => tool.name).sort());
    me.mockResolvedValue({
      error: { message: "Sorry, this API key is not valid." },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual(everything);
    expect(everything).toEqual(expect.arrayContaining(READ_TOOLS));
  });

  it("looks up permissions only to list tools, not to call one", async () => {
    findOne.mockResolvedValue({
      data: { data: { id: "chatbot-1" } },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    await client.callTool({
      name: "get_chatbot",
      arguments: { id: "chatbot-1" },
    });

    expect(me).not.toHaveBeenCalled();
  });

  it("lists chatbots through the API with the caller's key", async () => {
    findAll.mockResolvedValue({
      data: {
        data: [{ id: "chatbot-1", name: "Shop bot" }],
        _metadata: { pagination: { total: 1 } },
      },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    const result = await client.callTool({
      name: "list_chatbots",
      arguments: { search: "shop", status: "active", page: 2 },
    });

    expect(findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: KEY,
        baseURL: "http://api.test",
        // workerd rejects axios's default `cache: 'default'` on a fetch.
        adapter: "fetch",
        fetchOptions: { cache: "no-store" },
        query: { search: "shop", status: "active", page: 2 },
      }),
    );
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(textOf(result))).toEqual({
      chatbots: [{ id: "chatbot-1", name: "Shop bot" }],
      pagination: { total: 1 },
    });
  });

  it("accepts the key as an Authorization bearer token", async () => {
    findOne.mockResolvedValue({
      data: { data: { id: "chatbot-1", name: "Shop bot" } },
    } as never);
    const client = await connect({ authorization: `Bearer ${KEY}` });

    const result = await client.callTool({
      name: "get_chatbot",
      arguments: { id: "chatbot-1" },
    });

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ auth: KEY, path: { id: "chatbot-1" } }),
    );
    expect(JSON.parse(textOf(result))).toEqual({
      id: "chatbot-1",
      name: "Shop bot",
    });
  });

  it("returns an API error as a tool error", async () => {
    findOne.mockResolvedValue({
      error: { message: "Sorry, we couldn't find the requested chatbot." },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    const result = await client.callTool({
      name: "get_chatbot",
      arguments: { id: "missing" },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      "Sorry, we couldn't find the requested chatbot.",
    );
  });
});
