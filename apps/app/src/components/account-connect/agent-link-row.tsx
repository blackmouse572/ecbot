import { useLinkChatbotAccount } from "@/hooks/api/chatbot";
import { CHATBOT_TYPE_CONFIG } from "@/routes/chatbot/constants";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { ChatbotTypeBadge } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-badge";
import { Button, toast } from "@medusajs/ui";
import type { ChatbotLinkAccountResponseDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type AgentLinkRowChatbot = {
  id: string;
  name: string;
  avatar?: string;
  type?: string;
};

type Props = {
  chatbot: AgentLinkRowChatbot;
  /** The channels to link; a Facebook login brings several pages at once. */
  accountIds: string[];
  actionLabel: string;
  onLinked: (chatbot: AgentLinkRowChatbot) => void;
};

/** One agent in a picker; owns the link mutation, which is keyed by agent. */
export const AgentLinkRow: FC<Props> = ({
  chatbot,
  accountIds,
  actionLabel,
  onLinked,
}) => {
  const { t } = useTranslation();
  const link = useLinkChatbotAccount(chatbot.id);
  const config =
    CHATBOT_TYPE_CONFIG[chatbot.type as keyof typeof CHATBOT_TYPE_CONFIG];

  const handleLink = async () => {
    try {
      const res = await link.mutateAsync({ accounts: accountIds });
      const result = (res.data as A)?.data as
        ChatbotLinkAccountResponseDto | undefined;
      // The server skips an account that another agent already owns, so
      // only a confirmed link counts, and each skipped one is named.
      const linked = result?.linked ?? [];
      const skippedNames = (result?.skipped ?? [])
        .map((x) => x.name)
        .filter(Boolean)
        .join(", ");
      if (skippedNames) {
        toast.error(t("agentBuilder.ui.channelInUse", { name: skippedNames }));
      }
      if (linked.some((id) => accountIds.includes(id))) {
        if (!skippedNames) toast.success(t("chatbot.details.accountLinked"));
        onLinked(chatbot);
        return;
      }
      if (!skippedNames) toast.error(t("chatbot.details.accountLinkFailed"));
    } catch {
      toast.error(t("chatbot.details.accountLinkFailed"));
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border bg-ui-bg-field border-ui-border-base p-3">
      <div className="flex min-w-0 flex-col items-start gap-y-1">
        <ChatbotNameCell
          size="small"
          name={chatbot.name}
          avatar={chatbot.avatar}
        />
        {config && <ChatbotTypeBadge config={config} size="xsmall" />}
      </div>
      <Button
        size="small"
        variant="secondary"
        isLoading={link.isPending}
        onClick={handleLink}
      >
        {actionLabel}
      </Button>
    </div>
  );
};
