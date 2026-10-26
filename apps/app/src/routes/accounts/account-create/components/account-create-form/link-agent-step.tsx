import { AgentLinkRow } from "@/components/account-connect/agent-link-row";
import { AgentLinkRowSkeletons } from "@/components/account-connect/agent-link-row-skeletons";
import { useAccountChatbot, useChatbots } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { isConnectableAccountType } from "@/routes/chatbot/chatbot-create/agent-builder/channel-accounts";
import { ROUTES } from "@/routes/constants";
import { CheckCircleSolid } from "@medusajs/icons";
import { Button, Heading, Text } from "@medusajs/ui";
import { NoRecords } from "@repo/ui/common-components";
import { IconRobot } from "@tabler/icons-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { LINK_AGENT_CHATBOT_QUERY } from "./constants";
import type { LinkableAccount } from "./linkable-accounts";

type Props = {
  /** The new channels, already narrowed by `linkableAccounts`; never empty. */
  accounts: LinkableAccount[];
  onDone: () => void;
};

/**
 * The connect dialog's optional last step: a channel answers no one until an
 * agent is linked to it. A channel takes one agent, so once one is linked
 * only Complete is left.
 */
export const LinkAgentStep: FC<Props> = ({ accounts, onDone }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const accountIds = accounts.map((account) => account.id);
  // A reconnected channel can already have its agent.
  const owner = useAccountChatbot(accountIds[0]);
  const recent = useChatbots(LINK_AGENT_CHATBOT_QUERY as never);
  const [linkedName, setLinkedName] = useState<string>();
  const connectedName = linkedName ?? owner.chatbot?.name;
  const chatbots = recent.chatbots ?? [];

  // The builder pre-connects the channel it is opened with (`accountId`).
  const createAccount = accounts.find((account) =>
    isConnectableAccountType(account.type),
  );
  const createTo = `/${workspaceSlug}/${ROUTES.Chatbot}/create${
    createAccount ? `?accountId=${createAccount.id}` : ""
  }`;

  const renderBody = () => {
    if (connectedName) {
      return (
        <Text size="small" className="flex items-center gap-x-2">
          <CheckCircleSolid className="text-ui-tag-green-icon" />
          {t("accounts.create.linkAgent.linked", { name: connectedName })}
        </Text>
      );
    }
    if (owner.isLoading || recent.isLoading) {
      return (
        <div className="flex flex-col gap-2">
          <AgentLinkRowSkeletons count={3} />
        </div>
      );
    }
    if (recent.isError) {
      return (
        <div className="flex flex-col items-center gap-y-2 py-6">
          <Text size="small" className="text-ui-fg-muted text-center">
            {t("accounts.details.noChatbot.loadFailed")}
          </Text>
          <Button
            size="small"
            variant="secondary"
            onClick={() => recent.refetch()}
          >
            {t("actions.tryAgain")}
          </Button>
        </div>
      );
    }
    if (chatbots.length === 0) {
      return (
        <NoRecords
          icon={<IconRobot />}
          title={t("accounts.details.noChatbot.title")}
          message={t("accounts.details.noChatbot.message")}
          buttonVariant="transparentIconLeft"
          action={{
            to: createTo,
            label: t("accounts.details.noChatbot.action"),
          }}
        />
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {chatbots.map((chatbot) => (
          <AgentLinkRow
            key={chatbot.id}
            chatbot={chatbot}
            accountIds={accountIds}
            actionLabel={t("accounts.create.linkAgent.connect")}
            onLinked={(bot) => setLinkedName(bot.name)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div className="flex items-center justify-between gap-x-4">
        <div>
          <Heading>{t("accounts.create.linkAgent.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("accounts.create.linkAgent.description")}
          </Text>
        </div>
        <Button
          type="button"
          variant={connectedName ? "primary" : "secondary"}
          onClick={onDone}
        >
          {t("accounts.create.linkAgent.complete")}
        </Button>
      </div>
      {renderBody()}
    </div>
  );
};
