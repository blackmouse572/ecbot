import { useAIChat } from "@/components/ai-chat/ai-chat-provider";
import { widgetPublicControllerMessagesV1 } from "@repo/client";
import type { UIMessage } from "ai";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

/** Matches the operator dashboard's message poll. */
const POLL_MS = 5_000;

type WidgetMessage = {
  id: string;
  authorType: string;
  text?: string;
  dateSent: string;
};

/**
 * Keeps the widget's transcript in sync with the persisted conversation.
 *
 * Two things the chat's own stream cannot supply:
 *
 * 1. **History on mount.** A widget conversation is persisted (unlike the
 *    ephemeral preview), and the same visitor id resolves to the same
 *    conversation across page loads. Without this the visitor reloads and sees
 *    an empty window even though the bot still remembers everything.
 * 2. **Operator replies.** A bot reply arrives on the SSE response of the
 *    request that triggered it. Anything written while the visitor is idle — an
 *    operator taking over during handoff — has no such response to ride on, so
 *    it is polled for. Only `OPERATOR` messages are appended: bot replies are
 *    already on screen from their own stream, and appending them again would
 *    show every answer twice.
 *
 * Polls only while the window is open; the launcher posts `eccho:opened` /
 * `eccho:closed`, and a hidden iframe should not be polling at all.
 */
export function useWidgetTranscript({
  widgetKey,
  visitorId,
}: {
  widgetKey: string | undefined;
  visitorId: string;
}) {
  const { setMessages } = useAIChat();
  const [isOpen, setIsOpen] = useState(false);
  const cursorRef = useRef<string | undefined>(undefined);
  const seededRef = useRef(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "eccho:opened") setIsOpen(true);
      if (data.type === "eccho:closed") setIsOpen(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const { data } = useQuery({
    queryKey: ["widget-messages", widgetKey, visitorId],
    queryFn: async () => {
      const res = await widgetPublicControllerMessagesV1({
        path: { key: widgetKey! },
        query: { visitorId, after: cursorRef.current },
      });
      const rows =
        (res.data as unknown as { data: WidgetMessage[] }).data ?? [];
      // Advance the cursor so the next poll only asks for what is new.
      if (rows.length) cursorRef.current = rows[rows.length - 1].id;
      return rows;
    },
    enabled: !!widgetKey && !!visitorId,
    // The first fetch is the history seed and must happen even while closed —
    // otherwise an opened window starts blank. Polling is gated on `isOpen`.
    refetchInterval: isOpen ? POLL_MS : false,
    refetchIntervalInBackground: false,
    retry: false,
  });

  useEffect(() => {
    if (!data) return;

    if (!seededRef.current) {
      seededRef.current = true;
      // The whole persisted transcript, in order, replacing the empty start.
      if (data.length) setMessages(data.map(toUiMessage));
      return;
    }

    const operator = data.filter((m) => m.authorType === "OPERATOR");
    if (!operator.length) return;

    setMessages((current) =>
      // The cursor already excludes what we have seen, but a retried poll can
      // repeat a page — drop anything already on screen.
      current.concat(
        operator
          .filter((m) => !current.some((c) => c.id === m.id))
          .map(toUiMessage),
      ),
    );

    if (!isOpen) {
      window.parent?.postMessage(
        { type: "eccho:unread", count: operator.length },
        "*",
      );
    }
  }, [data, isOpen, setMessages]);
}

function toUiMessage(message: WidgetMessage): UIMessage {
  return {
    id: message.id,
    role: message.authorType === "USER" ? "user" : "assistant",
    parts: [{ type: "text", text: message.text ?? "" }],
  };
}
