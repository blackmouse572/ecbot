import { describe, it, expect } from "vitest";
import {
  buildChatStreamRequest,
  isEmptyRenderModel,
  partsToRenderModel,
  shareChatTransport,
  toolCallToChat,
  widgetChatTransport,
  workspaceChatTransport,
} from "./use-ai-chat-stream";

describe("partsToRenderModel", () => {
  it("joins text parts and surfaces guardrail", () => {
    const model = partsToRenderModel([
      { type: "text", text: "hello " },
      { type: "text", text: "world" },
    ]);
    expect(model.text).toBe("hello world");
    expect(model.guardrail).toBeUndefined();
  });

  it("extracts a data-guardrail part", () => {
    const model = partsToRenderModel([
      { type: "data-guardrail", data: { reason: "blocked" } },
    ]);
    expect(model.guardrail?.reason).toBe("blocked");
  });

  it("collects tool calls keyed by toolCallId", () => {
    const model = partsToRenderModel([
      {
        type: "tool-get_order",
        toolCallId: "inv1",
        state: "output-available",
        input: { id: 7 },
        output: { ok: true },
      },
    ]);
    expect(model.toolCalls[0].toolCallId).toBe("inv1");
    expect(model.toolCalls[0].output).toEqual({ ok: true });
  });

  it("shows send_image as its image (file part), not as a tool card", () => {
    const model = partsToRenderModel([
      {
        type: "tool-send_image",
        toolCallId: "inv1",
        state: "output-available",
        input: { url: "https://cdn/s.jpg" },
        output: { ok: true, url: "https://cdn/s.jpg" },
      },
      { type: "file", url: "https://cdn/s.jpg", mediaType: "image/*" },
    ]);
    expect(model.toolCalls).toEqual([]);
    expect(model.files).toEqual([
      { url: "https://cdn/s.jpg", mediaType: "image/*", filename: undefined },
    ]);
  });

  it("collects file parts with url/mediaType/filename", () => {
    const model = partsToRenderModel([
      { type: "text", text: "here you go" },
      {
        type: "file",
        url: "https://cdn.example/sales.pdf",
        mediaType: "application/pdf",
        filename: "sales.pdf",
      },
      {
        type: "file",
        url: "data:image/png;base64,abc",
        mediaType: "image/png",
      },
    ]);
    expect(model.text).toBe("here you go");
    expect(model.files).toEqual([
      {
        url: "https://cdn.example/sales.pdf",
        mediaType: "application/pdf",
        filename: "sales.pdf",
      },
      { url: "data:image/png;base64,abc", mediaType: "image/png" },
    ]);
  });

  it("falls back to empty strings for a bare file part missing url/mediaType", () => {
    const model = partsToRenderModel([{ type: "file" }]);
    expect(model.files).toEqual([{ url: "", mediaType: "" }]);
  });

  it("keeps mediaType when a file part is missing only its url", () => {
    const model = partsToRenderModel([
      { type: "file", mediaType: "image/png" },
    ]);
    expect(model.files).toEqual([{ url: "", mediaType: "image/png" }]);
  });

  it("silently skips unknown part types", () => {
    const model = partsToRenderModel([
      { type: "step-start" },
      { type: "data-custom", data: { anything: true } },
      { type: "text", text: "kept" },
    ]);
    expect(model.text).toBe("kept");
    expect(model.files).toEqual([]);
    expect(model.toolCalls).toEqual([]);
    expect(model.guardrail).toBeUndefined();
  });
});

describe("isEmptyRenderModel", () => {
  it("is true for a model with no content", () => {
    expect(isEmptyRenderModel({ text: "", toolCalls: [], files: [] })).toBe(
      true,
    );
  });

  it("is false when there is text", () => {
    expect(
      isEmptyRenderModel({ text: "hello", toolCalls: [], files: [] }),
    ).toBe(false);
  });

  it("is false when there is reasoning", () => {
    expect(
      isEmptyRenderModel({
        text: "",
        reasoning: "thinking…",
        toolCalls: [],
        files: [],
      }),
    ).toBe(false);
  });

  it("is false when there are tool calls", () => {
    expect(
      isEmptyRenderModel({
        text: "",
        toolCalls: [{ toolCallId: "inv1", toolName: "get_order" }],
        files: [],
      }),
    ).toBe(false);
  });

  it("is false when there are files", () => {
    expect(
      isEmptyRenderModel({
        text: "",
        toolCalls: [],
        files: [{ url: "https://cdn.example/x.png", mediaType: "image/png" }],
      }),
    ).toBe(false);
  });

  it("is false when there is a guardrail block", () => {
    expect(
      isEmptyRenderModel({
        text: "",
        toolCalls: [],
        files: [],
        guardrail: { reason: "blocked" },
      }),
    ).toBe(false);
  });
});

describe("toolCallToChat", () => {
  it("maps an errored tool output to status 'error' + surfaces errorMessage", () => {
    const chat = toolCallToChat({
      toolCallId: "inv1",
      toolName: "get_order",
      input: { id: 7 },
      state: "output-available",
      output: {
        invocationId: "inv1",
        status: "error",
        errorMessage: "HTTP 500",
        durationMs: 42,
      },
    });
    expect(chat.status).toBe("error");
    expect(chat.error).toBe("HTTP 500");
    expect(chat.durationMs).toBe(42);
  });

  it("maps a successful tool output to status 'success' + passes result + durationMs", () => {
    const chat = toolCallToChat({
      toolCallId: "inv2",
      toolName: "get_order",
      input: { id: 7 },
      state: "output-available",
      output: {
        invocationId: "inv2",
        status: "success",
        result: { total: 100 },
        durationMs: 13,
      },
    });
    expect(chat.status).toBe("success");
    expect(chat.result).toEqual({ total: 100 });
    expect(chat.error).toBeUndefined();
    expect(chat.durationMs).toBe(13);
  });

  it("treats a not-yet-complete tool call as 'running'", () => {
    const chat = toolCallToChat({
      toolCallId: "inv3",
      toolName: "get_order",
      input: { id: 7 },
      state: "input-available",
    });
    expect(chat.status).toBe("running");
  });
});

describe("chat transport configs", () => {
  // Authorization is no longer part of the shared client config (it's read
  // fresh off the token atom at send time, see use-ai-chat-stream.ts) — the
  // fixture reflects what @repo/client's config actually carries now.
  const clientConfig = {
    baseURL: "https://api.example.com/",
    headers: {
      "x-api-key": "key:secret",
      "x-custom-lang": "vi",
    },
  };

  const messages = [
    {
      id: "m1",
      role: "user" as const,
      parts: [{ type: "text", text: "hello" }],
    },
  ];

  it("posts a workspace turn to the authed stream proxy", () => {
    const request = buildChatStreamRequest({
      transport: workspaceChatTransport("acme", "cb1"),
      clientConfig,
      token: "abc",
      id: "session-1",
      messages: messages as never,
    });

    expect(request.api).toBe(
      "https://api.example.com/api/v1/shared/acme/chatbots/cb1/stream",
    );
    expect(request.body).toEqual({
      message: "hello",
      chat_session_id: "session-1",
    });
  });

  it("attaches the given token as a Bearer header on the workspace transport", () => {
    const request = buildChatStreamRequest({
      transport: workspaceChatTransport("acme", "cb1"),
      clientConfig,
      token: "abc",
      id: "session-1",
      messages: messages as never,
    });

    expect(request.headers).toMatchObject({
      Authorization: "Bearer abc",
      "x-api-key": "key:secret",
    });
  });

  it("sends no Authorization header on the workspace transport when there is no token", () => {
    const request = buildChatStreamRequest({
      transport: workspaceChatTransport("acme", "cb1"),
      clientConfig,
      token: null,
      id: "session-1",
      messages: messages as never,
    });

    expect(request.headers).not.toHaveProperty("Authorization");
  });

  it("posts a share turn to the public endpoint with the token in the body", () => {
    const request = buildChatStreamRequest({
      transport: shareChatTransport("tok-123"),
      clientConfig,
      token: null,
      id: "session-2",
      messages: messages as never,
    });

    expect(request.api).toBe(
      "https://api.example.com/api/v1/public/chatbots/preview/stream",
    );
    expect(request.body).toEqual({
      token: "tok-123",
      message: "hello",
      chat_session_id: "session-2",
    });
  });

  // The public route is unguarded; it must never carry the operator's own
  // session token or API key even if one happens to be set.
  it("strips credentials from the share transport but keeps the language", () => {
    const request = buildChatStreamRequest({
      transport: shareChatTransport("tok-123"),
      clientConfig,
      token: "abc",
      id: "session-2",
      messages: messages as never,
    });

    expect(request.headers).not.toHaveProperty("Authorization");
    expect(request.headers).not.toHaveProperty("x-api-key");
    expect(request.headers).toMatchObject({ "x-custom-lang": "vi" });
  });

  it("escapes path segments", () => {
    const request = buildChatStreamRequest({
      transport: workspaceChatTransport("a c/me", "cb 1"),
      clientConfig,
      token: "abc",
      id: "s",
      messages: messages as never,
    });

    expect(request.api).toContain("a%20c%2Fme");
    expect(request.api).toContain("cb%201");
  });

  it("does not double the slash when the base URL has no trailing one", () => {
    const request = buildChatStreamRequest({
      transport: shareChatTransport("t"),
      clientConfig: { ...clientConfig, baseURL: "https://api.example.com" },
      token: null,
      id: "s",
      messages: messages as never,
    });

    expect(request.api).toBe(
      "https://api.example.com/api/v1/public/chatbots/preview/stream",
    );
  });

  it("concatenates every text part of the outgoing message", () => {
    const request = buildChatStreamRequest({
      transport: shareChatTransport("t"),
      clientConfig,
      token: null,
      id: "s",
      messages: [
        {
          id: "m1",
          role: "user" as const,
          parts: [
            { type: "text", text: "Xin " },
            { type: "reasoning", text: "IGNORED" },
            { type: "text", text: "chao" },
          ],
        },
      ] as never,
    });

    expect((request.body as { message: string }).message).toBe("Xin chao");
  });

  // The widget endpoint takes `text` and keys the session by visitor, and
  // it rejects a body key its DTO does not declare.
  it("posts a widget turn as text with only the keys its endpoint declares", () => {
    const request = buildChatStreamRequest({
      transport: widgetChatTransport(
        "wk",
        "v1",
        "https://shop.example",
        () => "ts",
      ),
      clientConfig,
      token: null,
      id: "s",
      messages: messages as never,
    });

    expect(Object.keys(request.body).sort()).toEqual([
      "messageId",
      "parentOrigin",
      "text",
      "turnstileToken",
      "visitorId",
    ]);
    expect(request.body).toMatchObject({ text: "hello", visitorId: "v1" });
  });
});

describe("tool kinds", () => {
  it("attaches the data-tool-meta part to the tool call with the same id", () => {
    const model = partsToRenderModel([
      {
        type: "tool-get_order",
        toolCallId: "r1",
        state: "input-available",
        input: { id: 7 },
      },
      {
        type: "data-tool-meta",
        id: "r1",
        data: { kind: "mcp", label: "Shopify" },
      },
    ]);
    expect(model.toolCalls[0].meta).toEqual({
      kind: "mcp",
      label: "Shopify",
    });
  });

  it("reads the knowledge-search count", () => {
    const model = partsToRenderModel([
      { type: "data-knowledge", data: { count: 3 } },
      { type: "text", text: "Hi" },
    ]);
    expect(model.knowledgeCount).toBe(3);
  });

  it("carries the kind and label onto the chat tool call", () => {
    const chat = toolCallToChat({
      toolCallId: "r1",
      toolName: "get_order",
      state: "input-available",
      meta: { kind: "mcp", label: "Shopify" },
    });
    expect(chat).toMatchObject({
      kind: "mcp",
      label: "Shopify",
    });
  });

  it("names built-in tools by their fixed names when the stream sent no kind", () => {
    const kind = (toolName: string) =>
      toolCallToChat({ toolCallId: "r", toolName }).kind;
    expect(kind("load_skill")).toBe("skill");
    expect(kind("schedule_followup")).toBe("followup");
    expect(kind("apply_customer_tag")).toBe("tag");
    expect(kind("get_customer_field")).toBe("customer");
    expect(kind("lookup_order")).toBe("tool");
  });

  it("shows a tag that handed the chat to staff as a handoff", () => {
    const chat = toolCallToChat({
      toolCallId: "r1",
      toolName: "apply_customer_tag",
      input: { name: "needs-human" },
      state: "output-available",
      output: { applied: true, triggeredHandoff: true },
      meta: { kind: "tag" },
    });
    expect(chat.kind).toBe("handoff");
    expect(chat.status).toBe("success");
    expect(chat.result).toEqual({ applied: true, triggeredHandoff: true });
  });

  it("treats a built-in tool's error object as a failed call", () => {
    const chat = toolCallToChat({
      toolCallId: "r1",
      toolName: "schedule_followup",
      state: "output-available",
      output: { error: "no conversation context", instruction: "..." },
    });
    expect(chat.status).toBe("error");
    expect(chat.error).toBe("no conversation context");
  });

  it("falls back to a plain tool for a kind this app does not know", () => {
    const chat = toolCallToChat({
      toolCallId: "r1",
      toolName: "lookup",
      meta: { kind: "webhook" as never },
    });
    expect(chat.kind).toBe("tool");
  });
});
