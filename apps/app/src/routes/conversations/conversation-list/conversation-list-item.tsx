import { Avatar, Text, Tooltip, clx } from "@medusajs/ui";
import { Link as LinkIcon } from "@medusajs/icons";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { StatusPill } from "../components/status-pill";

interface Props {
  conversation: ConversationGetResponseDto;
  basePath: string;
  isActive: boolean;
  hasNewHandoff: boolean;
  showChatbot: boolean;
  hasMergeSuggestion?: boolean;
}

const formatTimestamp = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay
    ? date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString();
};

const fallbackInitials = (id: string) =>
  id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "??";

export const ConversationListItem = ({
  conversation,
  basePath,
  isActive,
  hasNewHandoff,
  showChatbot,
  hasMergeSuggestion,
}: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const senderLabel = (conversation as A).senderName ?? conversation.senderId;
  const senderAvatar = (conversation as A).senderAvatar as string | undefined;
  const account = conversation.account as A;
  const accountName = account?.name ?? account?.externalId ?? "";
  const accountId = account?.id as string | undefined;
  const chatbot = (conversation as A).chatbot as
    { id?: string; name?: string } | undefined;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`${basePath}/${conversation.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ")
          navigate(`${basePath}/${conversation.id}`);
      }}
      className={clx(
        "border-ui-border-base hover:bg-ui-bg-component-hover flex cursor-pointer items-start gap-x-3 border-b px-4 py-3 transition-colors",
        isActive &&
          "bg-ui-bg-base shadow-elevation-card-rest border-l-ui-fg-interactive",
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          variant="rounded"
          size="small"
          src={senderAvatar ?? undefined}
          fallback={fallbackInitials(senderLabel)}
        />
        {hasNewHandoff && (
          <span className="bg-ui-tag-orange-bg ring-ui-bg-subtle absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2" />
        )}
        <PlatformIcon
          type={(conversation.account as A)?.type}
          size={14}
          className="ring-ui-bg-subtle absolute -bottom-0.5 -right-0.5 ring-2"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-y-1">
        <div className="flex items-baseline justify-between gap-x-2">
          <Text
            size="small"
            weight="plus"
            leading="compact"
            className="truncate flex items-center gap-x-1"
          >
            {senderLabel}
            {hasMergeSuggestion && (
              <Tooltip
                content={t("conversations.list.row.mergeSuggestionBadge")}
              >
                <span
                  aria-label={t("conversations.list.row.mergeSuggestionBadge")}
                  className="text-ui-fg-muted inline-flex"
                >
                  <LinkIcon />
                </span>
              </Tooltip>
            )}
          </Text>
          <Text size="xsmall" className="text-ui-fg-muted shrink-0">
            {formatTimestamp(
              conversation.lastMessageAt ?? conversation.updatedAt,
            )}
          </Text>
        </div>
        <div className="flex min-w-0 items-center gap-x-2">
          {accountName &&
            (accountId ? (
              <Link
                to={`/${workspaceSlug}/accounts/${accountId}`}
                onClick={(e) => e.stopPropagation()}
                className="txt-compact-xsmall text-ui-fg-subtle hover:text-ui-fg-base truncate transition-colors"
              >
                {accountName}
              </Link>
            ) : (
              <Text size="xsmall" className="text-ui-fg-subtle truncate">
                {accountName}
              </Text>
            ))}
          {showChatbot &&
            chatbot?.name &&
            (chatbot.id ? (
              <Link
                to={`/${workspaceSlug}/chatbot/${chatbot.id}`}
                onClick={(e) => e.stopPropagation()}
                className="txt-compact-xsmall text-ui-fg-subtle hover:text-ui-fg-base truncate transition-colors"
              >
                {chatbot.name}
              </Link>
            ) : (
              <Text size="xsmall" className="text-ui-fg-subtle truncate">
                {chatbot.name}
              </Text>
            ))}
        </div>
        <div className="flex items-center gap-x-2">
          <StatusPill conversation={conversation} />
          {conversation.handoffReason && (
            <Text size="xsmall" className="text-ui-fg-muted truncate">
              {conversation.handoffReason}
            </Text>
          )}
          {(conversation as A).unreadCount > 0 && (
            <span className="bg-ui-tag-blue-bg text-ui-tag-blue-text ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none">
              {(conversation as A).unreadCount > 99
                ? "99+"
                : (conversation as A).unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
