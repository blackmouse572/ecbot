import { useWorkspaceAnalytics } from "@/hooks/api/workspace-analytics";
import { useMemo } from "react";

const BOT_TAB = ["bot" as const];

/**
 * Conversations per agent in the last 7 days, keyed by agent id, from the
 * dashboard's bot analytics (cached on the server for 10 minutes).
 */
export const useChatbotConversationCounts = () => {
  const { data } = useWorkspaceAnalytics("7d", BOT_TAB);
  const byChatbot = data.bot?.byChatbot;

  return useMemo(
    () => new Map((byChatbot ?? []).map((row) => [row.id, row.conversations])),
    [byChatbot],
  );
};
