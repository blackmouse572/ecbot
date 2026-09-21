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
