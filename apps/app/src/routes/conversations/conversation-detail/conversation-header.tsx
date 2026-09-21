import { Avatar, Text } from "@medusajs/ui";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { ChatbotBadge } from "../components/chatbot-badge";
import { StatusPill } from "../components/status-pill";
import { BotPauseSwitch, StatusActionsMenu } from "./status-actions-menu";

interface Props {
  conversation: ConversationGetResponseDto;
}

const fallbackInitials = (id: string) =>
  id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "??";

export const ConversationHeader = ({ conversation }: Props) => {
  const senderLabel = (conversation as A).senderName ?? conversation.senderId;
  const senderAvatar = (conversation as A).senderAvatar as string | undefined;
  const accountName =
    (conversation.account as A)?.name ??
    (conversation.account as A)?.externalId;

  return (
    <div className="border-ui-border-base bg-ui-bg-base flex items-center justify-between gap-x-3 border-b px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-x-3">
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
          <Text
            size="small"
            weight="plus"
            leading="compact"
            className="truncate"
          >
            {senderLabel}
          </Text>
          <div className="flex min-w-0 items-center gap-x-2">
            {accountName && (
              <Text
                size="xsmall"
                className="text-ui-fg-subtle min-w-0 truncate"
              >
                {accountName}
              </Text>
            )}
            <div className="shrink-0">
              <ChatbotBadge chatbot={(conversation as A).chatbot} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-x-2">
        <StatusPill conversation={conversation} />
        <BotPauseSwitch conversation={conversation} />
        <StatusActionsMenu conversation={conversation} />
      </div>
    </div>
  );
};
