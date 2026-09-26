import { toolsQueryKeys } from "@/hooks/api/tools";
import { SEND_IMAGE_TOOL_PART } from "./constants";
import { tokenAtom } from "@/modules/auth";
import type { ChatToolCall, ChatToolCallStatus } from "@/types/chat-message";
import { useChat } from "@ai-sdk/react";
import { client } from "@repo/client";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { getDefaultStore } from "jotai";
import { useEffect, useMemo, useRef } from "react";

export type RenderModelToolCall = {
  toolCallId: string;
  toolName: string;
  input?: unknown;
  output?: unknown;
  state?: string;
};

// The backend's `tool-output-available` `output` is a full
// ToolExecutionResponse — including for real failures, since the executor
// catches HTTP/timeout errors and returns `status: "error"` rather than
// raising (so the AI SDK part `state` is always "output-available").
type ToolExecutionOutput = {
  status?: "success" | "error";
  result?: unknown;
  errorMessage?: string;
  durationMs?: number;
};

/**
 * Pure mapper from an AI-SDK tool part (as flattened by `partsToRenderModel`)
 * to the shared `ChatToolCall` render shape. Derives status/error/duration
 * from the tool's real output payload instead of assuming success. No React
 * involved so it's unit-testable in isolation.
 */
export function toolCallToChat(tc: RenderModelToolCall): ChatToolCall {
  const output = tc.output as ToolExecutionOutput | undefined;
  const status: ChatToolCallStatus =
    tc.state !== "output-available"
      ? "running"
      : output?.status === "error"
        ? "error"
        : "success";

  return {
    invocationId: tc.toolCallId,
    toolName: tc.toolName,
    args: (tc.input as Record<string, unknown>) ?? {},
    status,
    result: output?.result,
    error: output?.errorMessage,
    durationMs: output?.durationMs,
  };
}

export type RenderModelFile = {
  url: string;
  mediaType: string;
  filename?: string;
};

export type RenderModel = {
  text: string;
  reasoning?: string;
  toolCalls: RenderModelToolCall[];
  files: RenderModelFile[];
  guardrail?: { reason: string };
};

type UIMessagePartLike = { type: string; [key: string]: unknown };

/**
 * Whether a rendered assistant message carries no content at all. A stream
 * that fails before producing any output leaves an empty in-flight message in
 * `useChat`'s message list — the caller renders the dedicated error marker
 * instead, so this empty message must not be shown as a blank bubble.
 */
export function isEmptyRenderModel(model: RenderModel): boolean {
  return (
    model.text === "" &&
    !model.reasoning &&
    !model.guardrail &&
    model.toolCalls.length === 0 &&
    model.files.length === 0
  );
}

/**
 * Pure mapper from a `UIMessage["parts"]` array to a flat shape that's easy
 * to render: concatenated text, concatenated reasoning, tool calls keyed by
 * `toolCallId`, and the (at most one) guardrail block. No React involved so
 * this is unit-testable in isolation.
 */
export function partsToRenderModel(
  parts: readonly UIMessagePartLike[],
): RenderModel {
  const model: RenderModel = { text: "", toolCalls: [], files: [] };

  for (const part of parts) {
    if (part.type === "text") {
      model.text += (part.text as string | undefined) ?? "";
    } else if (part.type === "reasoning") {
      model.reasoning =
        (model.reasoning ?? "") + ((part.text as string | undefined) ?? "");
    } else if (part.type === "file") {
      model.files.push({
        url: (part.url as string | undefined) ?? "",
        mediaType: (part.mediaType as string | undefined) ?? "",
        filename: part.filename as string | undefined,
      });
    } else if (part.type === "data-guardrail") {
      const data = part.data as { reason: string } | undefined;
      model.guardrail = { reason: data?.reason ?? "" };
    } else if (
      part.type.startsWith("tool-") &&
      part.type !== SEND_IMAGE_TOOL_PART
    ) {
      model.toolCalls.push({
        toolCallId: part.toolCallId as string,
        toolName: part.type.slice("tool-".length),
        input: part.input,
        output: part.output,
        state: part.state as string | undefined,
      });
    }
  }

  return model;
}

/**
 * Where a chat turn is sent and what identifies the caller.
 *
 * The same chat UI serves the authed operator preview and the public
 * share-link preview, which differ only in the endpoint, the extra body fields
 * and whether credentials travel with the request.
 */
export type ChatTransportConfig = {
  path: string;
  /**
   * Extra body fields. A function is read at send time, so a value that
   * changes during the conversation (a Turnstile token) stays fresh without
   * invalidating the memoized transport.
   */
  extraBody?: Record<string, unknown> | (() => Record<string, unknown>);
  /** Public routes are unguarded — sending credentials there is noise at best. */
  includeCredentials: boolean;
  /** Tool-invocation invalidation is an authed query; skip it when anonymous. */
  invalidateToolInvocations: boolean;
};

export function workspaceChatTransport(
  workspaceSlug: string,
  chatbotId: string,
): ChatTransportConfig {
  return {
    path: `/api/v1/shared/${encodeURIComponent(workspaceSlug)}/chatbots/${encodeURIComponent(chatbotId)}/stream`,
    includeCredentials: true,
    invalidateToolInvocations: true,
  };
}

export function shareChatTransport(
  token: string,
  getTurnstileToken?: () => string | undefined,
): ChatTransportConfig {
  return {
    // The token rides in the body, not the path: it is a bearer credential for
    // the LLM budget, and paths land in access logs and error breadcrumbs.
    path: "/api/v1/public/chatbots/preview/stream",
    extraBody: () => ({ token, turnstileToken: getTurnstileToken?.() }),
    includeCredentials: false,
    invalidateToolInvocations: false,
  };
}

export function widgetChatTransport(
  widgetKey: string,
  visitorId: string,
  parentOrigin: string | undefined,
  getTurnstileToken?: () => string | undefined,
): ChatTransportConfig {
  return {
    path: `/api/v1/public/widget/${encodeURIComponent(widgetKey)}/messages`,
    // The widget key is public (ADR-0014), so it can sit in the path. What must
    // not is `parentOrigin`: it identifies the customer's own page, and paths
    // land in access logs.
    extraBody: () => ({
      visitorId,
      messageId: crypto.randomUUID(),
      parentOrigin,
      turnstileToken: getTurnstileToken?.(),
    }),
    includeCredentials: false,
    invalidateToolInvocations: false,
  };
}

type ClientConfigLike = {
  baseURL?: string;
  headers?: Record<string, unknown>;
};

/**
 * Pure request builder for the AI SDK transport. The SDK calls `fetch`
 * directly rather than going through the shared axios instance (so the
 * axios request interceptor never sees it) — base URL and API-key/language
 * headers are lifted off `@repo/client`'s config, and the bearer token is
 * passed in explicitly since it no longer lives on that shared config.
 */
export function buildChatStreamRequest({
  transport,
  clientConfig,
  token,
  id,
  messages,
}: {
  transport: ChatTransportConfig;
  clientConfig: ClientConfigLike;
  token: string | null;
  id: string;
  messages: readonly UIMessage[];
}): { api: string; headers: HeadersInit; body: Record<string, unknown> } {
  const message =
    messages
      .at(-1)
      ?.parts?.filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text)
      .join("") ?? "";

  const headers = { ...((clientConfig.headers ?? {}) as Record<string, unknown>) };
  if (transport.includeCredentials) {
    if (token) headers.Authorization = `Bearer ${token}`;
  } else {
    delete headers.Authorization;
    delete headers["x-api-key"];
  }

  const extraBody =
    typeof transport.extraBody === "function"
      ? transport.extraBody()
      : transport.extraBody;

  return {
    // Strip a trailing slash so a base URL like `http://host/` doesn't
    // produce `//api/...`; concatenation (not `new URL`) preserves any
    // path prefix on the base URL, which an absolute-path `new URL` drops.
    api: `${(clientConfig.baseURL ?? "").replace(/\/$/, "")}${transport.path}`,
    headers: headers as HeadersInit,
    body: { ...extraBody, message, chat_session_id: id },
  };
}

/**
 * Wraps `@ai-sdk/react`'s `useChat` with a transport that talks to eccho's
 * chatbot stream endpoints, reusing the shared `@repo/client` axios config for
 * the base URL, auth and API-key headers.
 */
export function useAiChat({
  chatbotId,
  transport: transportConfig,
}: {
  chatbotId: string;
  transport: ChatTransportConfig;
}) {
  const queryClient = useQueryClient();
  const invalidatedToolCallIds = useRef<Set<string>>(new Set());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: transportConfig.path,
        prepareSendMessagesRequest: ({ id, messages }) =>
          buildChatStreamRequest({
            transport: transportConfig,
            clientConfig: client.getConfig() as ClientConfigLike,
            // Read fresh at send time (not memoized) — same freshness the
            // old code got from reading client.getConfig() live, before
            // Authorization moved off the shared client config.
            token: getDefaultStore().get(tokenAtom),
            id,
            messages,
          }),
      }),
    [transportConfig],
  );

  const chat = useChat<UIMessage>({ transport });

  // Mirror the old hook's behaviour: as soon as a tool call's result lands
  // (state reaches `output-available`), invalidate the chatbot's tool
  // invocations list so the tool-invocations panel refreshes.
  const shouldInvalidate = transportConfig.invalidateToolInvocations;
  useEffect(() => {
    if (!shouldInvalidate) return;
    for (const message of chat.messages) {
      for (const part of message.parts as UIMessagePartLike[]) {
        if (part.type.startsWith("tool-") && part.state === "output-available") {
          const toolCallId = part.toolCallId as string;
          if (!invalidatedToolCallIds.current.has(toolCallId)) {
            invalidatedToolCallIds.current.add(toolCallId);
            queryClient.invalidateQueries({
              queryKey: toolsQueryKeys.chatbotInvocations(chatbotId),
            });
          }
        }
      }
    }
  }, [chat.messages, chatbotId, queryClient, shouldInvalidate]);

  return chat;
}
