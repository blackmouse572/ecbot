import { useChatbots, useLinkChatbotAccount } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { isConnectableAccountType } from "@/routes/chatbot/chatbot-create/agent-builder/channel-accounts";
import { ROUTES } from "@/routes/constants";
import { CheckCircleSolid } from "@medusajs/icons";
import { Button, Container, Heading, Select, Text, toast } from "@medusajs/ui";
import type {
  AccountGetDetailResponseDto,
  ChatbotLinkAccountResponseDto,
} from "@repo/client";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LINK_AGENT_CHATBOT_QUERY } from "./constants";

type Props = {
  accounts: Pick<AccountGetDetailResponseDto, "id" | "type" | "name">[];
};

/**
 * After a channel connects, it answers no one until an agent is linked to it.
 * Link one of the workspace's agents right here, or build one for it.
 */
export const LinkAgentPanel: FC<Props> = ({ accounts }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { chatbots = [] } = useChatbots(LINK_AGENT_CHATBOT_QUERY);
  const [picked, setPicked] = useState<string>();
  const [linkedName, setLinkedName] = useState<string>();
  const chatbotId = picked ?? chatbots[0]?.id ?? "";
  const link = useLinkChatbotAccount(chatbotId);
  const connectable = accounts.filter((account) =>
    isConnectableAccountType(account.type),
  );

  if (connectable.length === 0) return null;

  const handleLink = async () => {
    const ids = connectable.map((account) => account.id);
    try {
      const res = await link.mutateAsync({ accounts: ids });
      const result = (
        res as { data?: { data?: ChatbotLinkAccountResponseDto } }
      )?.data?.data;
      if (!result?.linked?.length) {
        toast.error(t("accounts.create.linkAgent.taken"));
        return;
      }
      setLinkedName(chatbots.find((bot) => bot.id === chatbotId)?.name);
    } catch {
      toast.error(t("agentBuilder.ui.connectFailed"));
    }
  };

  const createTo = `/${workspaceSlug}/${ROUTES.Chatbot}/create?accountId=${connectable[0].id}`;

  return (
    <Container className="flex flex-col gap-y-3">
      <div>
        <Heading level="h2">{t("accounts.create.linkAgent.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("accounts.create.linkAgent.description")}
        </Text>
      </div>
      {linkedName ? (
        <Text size="small" className="flex items-center gap-x-2">
          <CheckCircleSolid className="text-ui-tag-green-icon" />
          {t("accounts.create.linkAgent.linked", { name: linkedName })}
        </Text>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {chatbots.length > 0 && (
            <>
              <Select value={chatbotId} onValueChange={setPicked}>
                <Select.Trigger
                  className="min-w-[200px] flex-1"
                  aria-label={t("accounts.create.linkAgent.pick")}
                >
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {chatbots.map((bot) => (
                    <Select.Item key={bot.id} value={bot.id}>
                      {bot.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Button onClick={handleLink} isLoading={link.isPending}>
                {t("accounts.create.linkAgent.link")}
              </Button>
            </>
          )}
          <Button
            variant={chatbots.length > 0 ? "transparent" : "primary"}
            asChild
          >
            <Link to={createTo}>{t("accounts.create.linkAgent.create")}</Link>
          </Button>
        </div>
      )}
    </Container>
  );
};
