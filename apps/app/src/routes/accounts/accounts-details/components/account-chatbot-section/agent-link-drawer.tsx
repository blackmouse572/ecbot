import { useChatbots, useLinkChatbotAccount } from "@/hooks/api/chatbot";
import { Avatar, Button, Drawer, Text, toast } from "@medusajs/ui";
import type { ChatbotLinkAccountResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { getAvatarFallback } from "@/components/utils/avatar-fallback";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
};

type RowProps = {
  chatbot: { id: string; name: string; avatar?: string };
  accountId: string;
  onLinked: () => void;
};

/** One agent in the picker; owns the link mutation, which is keyed by agent. */
const AgentRow = ({ chatbot, accountId, onLinked }: RowProps) => {
  const { t } = useTranslation();
  const link = useLinkChatbotAccount(chatbot.id);

  const handleAdd = async () => {
    try {
      const res = await link.mutateAsync({ accounts: [accountId] });
      const result = (res.data as A)?.data as
        ChatbotLinkAccountResponseDto | undefined;
      // The server can skip an account that another agent already owns, so
      // only a confirmed link counts as success.
      if (result?.linked?.includes(accountId)) {
        toast.success(t("chatbot.details.accountLinked"));
        onLinked();
        return;
      }
      toast.error(t("chatbot.details.accountLinkFailed"));
    } catch {
      toast.error(t("chatbot.details.accountLinkFailed"));
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border bg-ui-bg-field border-ui-border-base p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          size="small"
          src={chatbot.avatar}
          fallback={getAvatarFallback(chatbot.name)}
        />
        <Text size="small" weight="plus" className="truncate">
          {chatbot.name}
        </Text>
      </div>
      <Button
        size="small"
        variant="secondary"
        isLoading={link.isPending}
        onClick={handleAdd}
      >
        {t("actions.add")}
      </Button>
    </div>
  );
};

/** Pick one of the workspace's agents to answer on this channel. */
export const AgentLinkDrawer = ({ isOpen, onClose, accountId }: Props) => {
  const { t } = useTranslation();
  const { chatbots } = useChatbots({ perPage: 100, page: 1 });
  const available = (chatbots ?? []).filter((c) => c.status !== "archived");

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {t("accounts.details.noChatbot.drawerTitle")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-2">
          {available.length === 0 ? (
            <Text size="small" className="text-ui-fg-muted text-center py-6">
              {t("accounts.details.noChatbot.noneAvailable")}
            </Text>
          ) : (
            available.map((chatbot) => (
              <AgentRow
                key={chatbot.id}
                chatbot={chatbot}
                accountId={accountId}
                onLinked={onClose}
              />
            ))
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary">{t("actions.cancel")}</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};
