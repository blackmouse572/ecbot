import { Text, clx } from "@medusajs/ui";
import { ListSkeleton, NoRecords } from "@repo/ui/common-components";
import { IconMessages } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import {
  useConversations,
  type ConversationGetResponseDto,
} from "@/hooks/api/conversations";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { StatusPill } from "../../../components/status-pill";

const PER_PAGE = 100;

interface Props {
  customerId: string;
  conversationId?: string;
}

export function ConversationsSection({ customerId, conversationId }: Props) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { conversations, isPending, isError } = useConversations({
    customer: customerId,
    perPage: PER_PAGE,
    orderBy: "lastMessageAt",
    orderDirection: "DESC",
  });

  if (isPending)
    return <ListSkeleton label={t("general.loading")} rowCount={2} />;

  if (isError) {
    return (
      <Text size="small" className="text-ui-fg-error">
        {t("general.loadFailed")}
      </Text>
    );
  }

  if (conversations.length === 0) {
    return (
      <NoRecords
        size="small"
        title={t("conversations.customer.panel.conversations.empty")}
        icon={<IconMessages />}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-y-2">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          href={`/${workspaceSlug}/${ROUTES.Conversations}/${conversation.id}`}
          isCurrent={conversation.id === conversationId}
        />
      ))}
    </ul>
  );
}

function ConversationItem({
  conversation,
  href,
  isCurrent,
}: {
  conversation: ConversationGetResponseDto;
  href: string;
  isCurrent: boolean;
}) {
  const { t } = useTranslation();
  const account = conversation.account as A;
  const chatbot = (conversation as A).chatbot as { name?: string } | undefined;
  const lastMessageAt = (conversation as A).lastMessageAt as string | undefined;

  return (
    <li>
      <Link
        to={href}
        aria-current={isCurrent ? "page" : undefined}
        className={clx(
          "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover flex flex-col gap-y-1.5 rounded border px-2 py-1.5 transition-colors",
          isCurrent && "border-ui-border-interactive",
        )}
      >
        <div className="flex items-center gap-x-2">
          <PlatformIcon type={account?.type} size={16} />
          <Text size="small" weight="plus" className="min-w-0 flex-1 truncate">
            {account?.name ?? account?.externalId ?? ""}
          </Text>
          {isCurrent && (
            <Text size="xsmall" className="text-ui-fg-interactive shrink-0">
              {t("conversations.customer.panel.conversations.current")}
            </Text>
          )}
        </div>
        <div className="flex items-center justify-between gap-x-2">
          <Text size="xsmall" className="text-ui-fg-subtle min-w-0 truncate">
            {chatbot?.name}
          </Text>
          <StatusPill conversation={conversation} />
        </div>
        {lastMessageAt && (
          <Text size="xsmall" className="text-ui-fg-muted">
            {new Date(lastMessageAt).toLocaleString()}
          </Text>
        )}
      </Link>
    </li>
  );
}
