export type ChatToolCallStatus = "running" | "success" | "error";

/**
 * What a tool call does, as sent by the AI service in `data-tool-meta`:
 * registry tools (`http`, `mcp`), a skill load, or a built-in. `handoff` is a
 * tag that handed the chat to staff; `tool` is a call of unknown kind.
 */
export type ToolKind =
  | "http"
  | "mcp"
  | "skill"
  | "customer"
  | "tag"
  | "handoff"
  | "followup"
  | "image"
  | "tool";

export type ChatToolCall = {
  invocationId: string;
  toolName: string;
  actionName?: string;
  args: Record<string, unknown>;
  status: ChatToolCallStatus;
  result?: unknown;
  error?: string;
  durationMs?: number;
  kind?: ToolKind;
  /** Registry tool's display name (e.g. "Shopify"). */
  label?: string;
};

// Sources come from the AI SDK's `source-url` UI message part
// (`{ sourceId, url, title }`), so only these fields are guaranteed.
export type RagSource = {
  id: string;
  /** The knowledge item's (or web page's) name; never a storage file name. */
  title?: string;
  filename?: string;
  sourceUrl?: string | null;
};

// A media attachment on a persisted conversation message (customer photo or
// an image the bot sent). `url` is absent when the platform gave only an id.
export type MessageAttachment = {
  type: string;
  url?: string;
};
