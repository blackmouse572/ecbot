import { useChatbot } from "@/hooks/api";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";

type BreadcrumbMatch = UIMatch<ChatbotGetDetailResponseDto>;

/**
 * Trailing crumb of `/chatbot/:id`. The route already loaded the chatbot, so
 * the match data seeds the cache and the crumb renders without a second fetch.
 */
export const ChatbotDetailBreadcrumb = (match: BreadcrumbMatch) => {
  const chatbotId = match.params.id;
  const { chatbot } = useChatbot(chatbotId as string, {
    initialData: match.data,
    enabled: Boolean(chatbotId),
  });

  if (!chatbot) return null;

  const { name: chatbotName } = chatbot;

  return (
    <span>
      {chatbotName}
      <Helmet title={`${chatbotName} - Ecbot`} />
    </span>
  );
};
