import { Text } from "@medusajs/ui";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
  NoRecords,
  Skeleton,
} from "@repo/ui/common-components";
import type {
  MessageGetResponseDto,
  ReactToMessageAction,
} from "@/hooks/api/conversations";
import { useConversationFollowups } from "@/hooks/api/followups";
import { MessageBubble } from "./message-bubble";
import { SystemNote } from "./system-note";
import { IconMessage } from "@tabler/icons-react";

interface Props {
  conversationId?: string;
  messages: MessageGetResponseDto[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onRetry: (text: string, clientNonce: string) => void;
  currentOperatorId?: string;
  canReact?: boolean;
  reactionWindowClosed?: boolean;
  onReact?: (
    messageId: string,
    emoji: string,
    action: ReactToMessageAction,
  ) => void;
}

export const MessageList = ({
  conversationId,
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onRetry,
  currentOperatorId,
  canReact,
  reactionWindowClosed,
  onReact,
}: Props) => {
  const { t } = useTranslation();
  const { followups } = useConversationFollowups(conversationId ?? "");
  const triggerIds = useMemo(
    () =>
      new Set(
        followups.map((f) => f.triggerMessageId).filter(Boolean) as string[],
      ),
    [followups],
  );

  // Load older messages when the reader scrolls near the top. The scroller
  // preserves position across the prepend so the view doesn't jump.
  const handleReachTop = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <MessageScroller>
      <MessageScrollerViewport onReachTop={handleReachTop}>
        <MessageScrollerContent>
          {isLoading ? (
            <div className="flex flex-col gap-y-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-8 w-2/3 self-end" />
              <Skeleton className="h-8 w-2/5" />
            </div>
          ) : (
            <>
              {isFetchingNextPage && (
                <div className="flex justify-center py-2">
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {t("conversations.detail.loading")}
                  </Text>
                </div>
              )}
              {messages.length === 0 && (
                <NoRecords
                  title={t("conversations.detail.noMessages")}
                  message={t("conversations.detail.noMessagesHint")}
                  icon={<IconMessage />}
                />
              )}
              {messages.map((m) => (
                <MessageScrollerItem
                  key={m.id}
                  messageId={m.id}
                  scrollAnchor={m.direction === "OUTBOUND"}
                >
                  {m.authorType === "SYSTEM" ? (
                    <SystemNote />
                  ) : (
                    <MessageBubble
                      id={`msg-${m.id}`}
                      message={m}
                      currentOperatorId={currentOperatorId}
                      onRetry={onRetry}
                      hasFollowup={triggerIds.has(m.id)}
                      canReact={canReact}
                      reactionWindowClosed={reactionWindowClosed}
                      onReact={onReact}
                    />
                  )}
                </MessageScrollerItem>
              ))}
            </>
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
};
