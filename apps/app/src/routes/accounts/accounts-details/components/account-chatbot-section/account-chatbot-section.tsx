import { ChatbotSection } from "@/components/chatbot/chatbot-section";
import { useAccountChatbot } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { isConnectableAccountType } from "@/routes/chatbot/chatbot-create/agent-builder/channel-accounts";
import { ROUTES } from "@/routes/constants";
import { IconRobot } from "@tabler/icons-react";
import { Container, Divider, Heading } from "@medusajs/ui";
import type { AccountGetDetailResponseDto, ChatbotListResponseDto } from "@repo/client";
import { NoRecords } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type Props = {
  accountId: string;
  type: AccountGetDetailResponseDto["type"];
  initialData?: ChatbotListResponseDto[];
};

/**
 * Sidebar card naming the agent that answers on this account. With none
 * linked, every connectable channel type gets a quick create into the
 * builder; types the builder cannot connect render nothing.
 */
export const AccountChatbotSection = ({ accountId, type, initialData }: Props) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { chatbot, isLoading, isError } = useAccountChatbot(accountId, { initialData });

  const linkedChatbotId = isLoading ? undefined : chatbot?.id;

  if (linkedChatbotId) {
    return <ChatbotSection chatbotId={linkedChatbotId} title={t("chatbot.title")} />;
  }

  // Without a settled lookup there is nothing honest to show: a failed
  // request must not claim the channel has no agent.
  if (isLoading || isError || !isConnectableAccountType(type)) return null;

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-y-1 p-6 py-4">
        <Heading>{t("chatbot.title")}</Heading>
      </div>
      <Divider variant="dashed" />
      <NoRecords
        size="small"
        icon={<IconRobot />}
        title={t("accounts.details.noChatbot.title")}
        message={t("accounts.details.noChatbot.message")}
        action={{
          to: `/${workspaceSlug}/${ROUTES.Chatbot}/create?accountId=${accountId}`,
          label: t("accounts.details.noChatbot.action"),
        }}
      />
    </Container>
  );
};
