export type ChatToolCallStatus = "running" | "success" | "error";

export type ChatToolCall = {
  invocationId: string;
  toolName: string;
  actionName?: string;
  args: Record<string, unknown>;
  status: ChatToolCallStatus;
  result?: unknown;
  error?: string;
  durationMs?: number;
};

// Sources come from the AI SDK's `source-url` UI message part
// (`{ sourceId, url, title }`), so only these fields are guaranteed.
export type RagSource = {
  id: string;
  filename?: string;
  sourceUrl?: string | null;
};

// A media attachment on a persisted conversation message (customer photo or
// an image the bot sent). `url` is absent when the platform gave only an id.
export type MessageAttachment = {
  type: string;
  url?: string;
};
