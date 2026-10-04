import type { RagSource } from "@/types/chat-message";

type WireSource = {
  id?: unknown;
  title?: unknown;
  source_url?: unknown;
};

/**
 * Every knowledge source behind an answer, from the `message-metadata` part
 * apps/ai sends (uploaded files and text items included, unlike the
 * `source-url` parts, which only cover web pages). For operators only.
 */
export function metadataSources(metadata: unknown): RagSource[] {
  const sources = (metadata as { sources?: unknown } | undefined)?.sources;
  if (!Array.isArray(sources)) return [];
  return (sources as WireSource[])
    .filter((s): s is WireSource & { id: string } => typeof s?.id === "string")
    .map((s) => ({
      id: s.id,
      title: typeof s.title === "string" && s.title ? s.title : undefined,
      sourceUrl: typeof s.source_url === "string" ? s.source_url : null,
    }));
}
