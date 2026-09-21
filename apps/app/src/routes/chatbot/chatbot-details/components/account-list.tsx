import { useUnlinkChatbotAccount } from "@/hooks/api/chatbot";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { ArrowUpRightOnBox, PlusMini, XMarkMini } from "@medusajs/icons";
import {
  clx,
  Container,
  Heading,
  IconButton,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { PlatformIcon } from "../../../../components/platform-icon/platform-icon";
import { AccountLinkDrawer } from "./account-link-drawer";
import { AccountListEmpty } from "./account-list-empty";

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
  title?: string;
  linkedCount?: number;
  accounts: LinkedAccount[];
  className?: string;
}

export function AccountList({
  title = "Accounts",
  item,
  linkedCount,
  accounts,
  className = "",
}: AccountListProps) {
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
      <Container className={clx("divide-y p-0", className)}>
        <div className="flex items-start justify-between px-6 pt-4 pb-2">
          <div>
            <Heading level="h3" className="text-lg font-semibold">
              {title}
            </Heading>
            {linkedCount !== undefined && (
              <Text size="small" className="text-ui-fg-muted">
                {linkedCount} {t("chatbot.details.linkedAccounts")}
              </Text>
            )}
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              variant="transparent"
              size="small"
              onClick={() => setDrawerOpen(true)}
            >
              <PlusMini />
            </IconButton>
            <Link to={accountsHref} state={{ prev: pathname }}>
              <IconButton variant="transparent" size="small">
                <ArrowUpRightOnBox />
              </IconButton>
            </Link>
          </div>
        </div>
        <div className="px-6 py-4 flex flex-col gap-6">
          {accounts.length > 0 ? (
            accounts.map((account) => (
              <LinkedAccountRow
                key={account.id}
                account={account}
                busy={unlinkingId === account.id}
                onUnlink={() => confirmUnlink(account)}
              />
            ))
          ) : (
            <AccountListEmpty chatbotId={item.id} />
          )}
        </div>
      </Container>

      <AccountLinkDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chatbotId={item.id}
      />
    </>
  );
}
