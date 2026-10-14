import { useUnlinkChatbotAccount } from "@/hooks/api/chatbot";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { ArrowUpRightOnBox, PlusMini, XMarkMini } from "@medusajs/icons";
import {
  Button,
  IconButton,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { NoRecords } from "@repo/ui/common-components";
import { IconPlugConnected } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { PlatformIcon } from "../../../../components/platform-icon/platform-icon";
import { AccountLinkDrawer } from "./account-link-drawer";

type LinkedAccount = ChatbotGetDetailResponseDto["accounts"][number];

/** Deep link to the accounts list, pre-filtered to one chatbot. */
const useLinkedAccountsHref = (chatbotId: string) => {
  const { workspaceSlug: slug } = useWorkspaceParams();

  return `/${slug}/${ROUTES.Accounts}?chatbot=${chatbotId}`;
};

type LinkedAccountRowProps = {
  account: LinkedAccount;
  /** Unlink is in flight for this row, so its button is held disabled. */
  busy: boolean;
  onUnlink: () => void;
};

/** One linked channel: platform mark, name, state, and a hover-only unlink. */
const LinkedAccountRow = ({
  account,
  busy,
  onUnlink,
}: LinkedAccountRowProps) => {
  const { t } = useTranslation();

  return (
    <div className="group flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <PlatformIcon size={24} type={account.type} />
        <Text className="truncate" size="small">
          {account.name}
        </Text>
      </div>
      <div className="flex items-center gap-4 ml-4 flex-shrink-0">
        <StatusBadge color="green">
          {t("chatbot.details.account.active")}
        </StatusBadge>
        <IconButton
          variant="transparent"
          size="small"
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={t("accounts.list.action.unlink")}
          onClick={onUnlink}
          disabled={busy}
        >
          <XMarkMini />
        </IconButton>
      </div>
    </div>
  );
};

interface AccountListProps {
  item: Pick<ChatbotGetDetailResponseDto, "id">;
  accounts: LinkedAccount[];
}

/** The channels the agent answers on, as a block inside the general card. */
export function AccountList({ item, accounts }: AccountListProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const accountsHref = useLinkedAccountsHref(item.id);
  const prompt = usePrompt();
  const unlink = useUnlinkChatbotAccount(item.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const confirmUnlink = async (account: LinkedAccount) => {
    const confirmed = await prompt({
      title: t("accounts.unlink.confirm.title"),
      description: t("accounts.unlink.confirm.description"),
      confirmText: t("accounts.unlink.confirm.confirmButton"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    setUnlinkingId(account.id);
    try {
      await unlink.mutateAsync({ accounts: [account.id] });
      toast.success(t("accounts.unlink.success"));
    } catch {
      toast.error(t("accounts.unlink.error"));
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div className="flex items-center justify-between gap-x-2">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            {t("chatbot.details.general.channels")}
          </Text>
          <div className="flex items-center gap-x-1">
            <Button
              size="small"
              variant="transparent"
              onClick={() => setDrawerOpen(true)}
            >
              <PlusMini />
              {t("actions.linkAccount")}
            </Button>
            <Link to={accountsHref} state={{ prev: pathname }}>
              <IconButton
                variant="transparent"
                size="small"
                aria-label={t("accounts.title")}
              >
                <ArrowUpRightOnBox />
              </IconButton>
            </Link>
          </div>
        </div>
        {accounts.length > 0 ? (
          <div className="flex flex-col gap-y-3">
            {accounts.map((account) => (
              <LinkedAccountRow
                key={account.id}
                account={account}
                busy={unlinkingId === account.id}
                onUnlink={() => confirmUnlink(account)}
              />
            ))}
          </div>
        ) : (
          <NoRecords
            size="small"
            title={t("chatbot.details.noAccounts")}
            message={t("chatbot.details.noAccountsDescription")}
            action={{
              onClick: () => setDrawerOpen(true),
              label: t("actions.linkAccount"),
            }}
            icon={<IconPlugConnected />}
          />
        )}
      </div>

      <AccountLinkDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chatbotId={item.id}
      />
    </>
  );
}
