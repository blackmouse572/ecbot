import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { useUnlinkAccounts } from "@/hooks/api";
import { useLinkChatbotAccount } from "@/hooks/api/chatbot";
import { MagnifyingGlass } from "@medusajs/icons";
import { Avatar, Button, Drawer, Input, Text, toast } from "@medusajs/ui";
import type { ChatbotLinkAccountResponseDto } from "@repo/client";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "../../../../components/platform-icon/platform-icon";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
}

export function AccountLinkDrawer({ isOpen, onClose, chatbotId }: Props) {
  const { t } = useTranslation();
  const { accounts } = useUnlinkAccounts({ perPage: 100 });
  const link = useLinkChatbotAccount(chatbotId);
  const [search, setSearch] = useState("");

  const available = useMemo(
    () =>
      (accounts ?? [])
        // User-level Facebook accounts aren't a messaging channel
        // themselves (only their pages are), consistent with the agent
        // builder's channels turn.
        .filter((a) => a.type !== "FACEBOOK_ACCOUNT")
        .filter((a) => !search || a.name?.toLowerCase().includes(search.toLowerCase())),
    [accounts, search],
  );

  const handleAdd = async (accountId: string, accountName: string) => {
    try {
      const res = await link.mutateAsync({ accounts: [accountId] });
      const result = (res.data as A)?.data as ChatbotLinkAccountResponseDto | undefined;
      // The server can refuse an id already owned by another chatbot
      // (ChatbotService.linkBatchAccounts); only a success toast when the
      // response actually confirms this id linked.
      if (result?.linked?.includes(accountId)) {
        toast.success(t("chatbot.details.accountLinked"));
        onClose();
        return;
      }
      const skippedName = result?.skipped?.find((s) => s.id === accountId)?.name ?? accountName;
      toast.error(t("agentBuilder.ui.channelInUse", { name: skippedName }));
    } catch {
      toast.error(t("chatbot.details.accountLinkFailed"));
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("chatbot.details.addAccount")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-fg-muted" />
            <Input
              className="pl-9"
              placeholder={t("app.search.label")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {available.length === 0 ? (
            <Text size="small" className="text-ui-fg-muted text-center py-6">
              {t("chatbot.edit.noAccountsAvailable")}
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {available.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border bg-ui-bg-field border-ui-border-base p-3"
                >
                  <div className="flex items-center gap-3">
                    <PlatformIcon size={24} type={account.type} />
                    <Text size="small" weight="plus">
                      {account.name}
                    </Text>
                  </div>
                  <Button
                    size="small"
                    variant="secondary"
                    isLoading={link.isPending}
                    onClick={() => handleAdd(account.id, account.name)}
                  >
                    {t("actions.add")}
                  </Button>
                </div>
              ))}
            </div>
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
}
