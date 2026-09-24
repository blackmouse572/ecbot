import { ChatbotSection } from "@/components/chatbot/chatbot-section";
import { useAccountChatbot } from "@/hooks/api";
import type { ChatbotListResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";

type Props = {
  accountId: string;
  initialData?: ChatbotListResponseDto[];
};

/**
 * Sidebar card naming the chatbot that answers on this account. Accounts
 * without one render nothing rather than an empty card.
 */
export const AccountChatbotSection = ({ accountId, initialData }: Props) => {
  const { t } = useTranslation();
  const { chatbot, isLoading } = useAccountChatbot(accountId, { initialData });

  const linkedChatbotId = isLoading ? undefined : chatbot?.id;

  if (!linkedChatbotId) return null;

  return (
    <ChatbotSection chatbotId={linkedChatbotId} title={t("chatbot.title")} />
  );
};
