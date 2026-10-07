import { ArrowLeft } from "@medusajs/icons";
import { Avatar, IconButton, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { ChatbotBadge } from "../components/chatbot-badge";
import { StatusPill } from "../components/status-pill";
import { BotPauseSwitch, StatusActionsMenu } from "./status-actions-menu";

interface Props {
  conversation: ConversationGetResponseDto;
  // Small screens only: back to the list, and open the customer details.
  onBack?: () => void;
  onOpenCustomer?: () => void;
}

const fallbackInitials = (id: string) =>
  id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "??";

export const ConversationHeader = ({
  conversation,
  onBack,
  onOpenCustomer,
}: Props) => {
  const { t } = useTranslation();
  const senderLabel = (conversation as A).senderName ?? conversation.senderId;
  const senderAvatar = (conversation as A).senderAvatar as string | undefined;
  const accountName =
    (conversation.account as A)?.name ??
    (conversation.account as A)?.externalId;

  const identity = (
    <>
      <div className="relative shrink-0">
        <Avatar
          variant="rounded"
          size="small"
          src={senderAvatar ?? undefined}
          fallback={fallbackInitials(senderLabel)}
        />
        <PlatformIcon
          type={(conversation.account as A)?.type}
          size={14}
          className="ring-ui-bg-base absolute -bottom-0.5 -right-0.5 ring-2"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-y-0.5">
        <Text size="small" weight="plus" leading="compact" className="truncate">
          {senderLabel}
        </Text>
        <div className="flex min-w-0 items-center gap-x-2">
          {accountName && (
            <Text size="xsmall" className="text-ui-fg-subtle min-w-0 truncate">
              {accountName}
            </Text>
          )}
          <div className="shrink-0">
            <ChatbotBadge chatbot={(conversation as A).chatbot} />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="border-ui-border-base bg-ui-bg-base flex items-center justify-between gap-x-3 border-b px-3 py-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-x-2">
        {onBack && (
          <IconButton
            size="small"
            variant="transparent"
            className="shrink-0"
            onClick={onBack}
            aria-label={t("actions.back")}
          >
            <ArrowLeft />
          </IconButton>
        )}
        {onOpenCustomer ? (
          <button
            type="button"
            onClick={onOpenCustomer}
            className="flex min-w-0 flex-1 items-center gap-x-3 rounded-md text-left outline-none focus-visible:shadow-borders-focus"
          >
            {identity}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-x-3">
            {identity}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-x-2">
        <div className="max-sm:hidden">
          <StatusPill conversation={conversation} />
        </div>
        <BotPauseSwitch conversation={conversation} />
        <StatusActionsMenu conversation={conversation} />
      </div>
    </div>
  );
};
