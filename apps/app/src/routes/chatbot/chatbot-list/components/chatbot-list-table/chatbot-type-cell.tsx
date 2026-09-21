import { CHATBOT_TYPE_CONFIG } from "@/routes/chatbot/constants";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { ChatbotTypeBadge } from "./chatbot-type-badge";

type Props = { item: Pick<ChatbotGetDetailResponseDto, "type"> };

type ChatbotType = keyof typeof CHATBOT_TYPE_CONFIG;

/** Industry pill for a chatbot row; falls back to the raw type if unmapped. */
export function ChatbotTypeCell({ item }: Props) {
  const config = CHATBOT_TYPE_CONFIG[item.type as ChatbotType];

  return config ? <ChatbotTypeBadge config={config} size="small" /> : item.type;
}
