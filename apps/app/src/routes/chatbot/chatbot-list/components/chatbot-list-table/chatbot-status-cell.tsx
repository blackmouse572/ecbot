import { CHATBOT_STATUS_CONFIG } from "@/routes/chatbot/constants";
import { StatusBadge } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";

type Props = { item: Pick<ChatbotGetDetailResponseDto, "status"> };

type ChatbotStatus = keyof typeof CHATBOT_STATUS_CONFIG;

/** What an unknown status reads as — the state the API creates chatbots in. */
const UNKNOWN_STATUS = CHATBOT_STATUS_CONFIG.active;

/** Status dot and label for a chatbot row. */
export function ChatbotStatusCell({ item }: Props) {
  const { color, label } =
    CHATBOT_STATUS_CONFIG[item.status as ChatbotStatus] ?? UNKNOWN_STATUS;

  return <StatusBadge color={color}>{label}</StatusBadge>;
}
