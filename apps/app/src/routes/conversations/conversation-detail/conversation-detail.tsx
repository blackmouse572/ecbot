import { toast } from "@medusajs/ui";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  useConversation,
  useConversationMessages,
  useMarkConversationRead,
  useReactToMessage,
  useSendOperatorReply,
} from "@/hooks/api/conversations";
import { useMe } from "@/hooks/api/users";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components";
import { CustomerSidePanel } from "../customer-side-panel";
import { ConversationHeader } from "./conversation-header";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";
import { isReactionWindowClosed } from "./reaction-window";
import { useConversationSidebar } from "./use-conversation-sidebar";

export function ConversationDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { open: sidebarOpen, toggle: toggleSidebar } = useConversationSidebar();

  const { user } = useMe();
  const currentOperatorId = (user as A)?.id as string | undefined;

  const { conversation, isLoading: isLoadingConversation } =
    useConversation(id);
  const {
    messages,
    isLoading: isLoadingMessages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useConversationMessages(id);
  const send = useSendOperatorReply(id);
  const markRead = useMarkConversationRead(id);
  const react = useReactToMessage(id, currentOperatorId);

  // Scrolls the message thread to the message that triggered a followup and
  // briefly highlights it. Kept minimal: no context/state lib, just a DOM
  // lookup by the stable `msg-${id}` id each MessageBubble carries.
  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("bg-ui-tag-orange-bg", "rounded-md");
    window.setTimeout(() => {
      el.classList.remove("bg-ui-tag-orange-bg", "rounded-md");
    }, 1500);
  }, []);

  // Mark the conversation as "viewed" so the handoff dot disappears on the list,
  // and record the operator's read state for the unread badge.
  useEffect(() => {
    if (!id) return;
    const key = `conversations.lastViewedAt.${id}`;
    const now = Date.now();
    try {
      const last = localStorage.getItem(key);
      // Debounce: skip if viewed within the last 5 seconds (rapid navigation guard)
      if (last && now - parseInt(last, 10) < 5000) return;
      localStorage.setItem(key, now.toString());
    } catch {
      /* ignore */
    }
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return null;

  if (isLoadingConversation && !conversation) {
    return (
      <div className="text-ui-fg-subtle flex flex-1 items-center justify-center">
        {t("conversations.detail.loading")}
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-ui-fg-subtle flex flex-1 items-center justify-center">
        {t("conversations.detail.notFound")}
      </div>
    );
  }

  const isResolved = conversation.status === "RESOLVED";

  const onSend = (text: string) => {
    send.mutate(
      { text },
      {
        onError: () => {
          toast.error(t("conversations.errors.sendFailed"));
        },
      },
    );
  };

  const onRetry = (text: string, clientNonce: string) => {
    send.mutate(
      { text, retryOfClientNonce: clientNonce },
      {
        onError: () => {
          toast.error(t("conversations.errors.sendFailed"));
        },
      },
    );
  };

  // useReactToMessage already rolls back + toasts on error, so no extra
  // onError handling is needed here.
  const onReact = (
    messageId: string,
    emoji: string,
    action: "react" | "unreact",
  ) => {
    react.mutate({ messageId, emoji, action });
  };

  const customerId = (conversation as A).customerId as string | undefined;

  // Meta (Messenger/IG) only allows operator reactions within the 24h window
  // opened by the customer's last inbound message; outside it the picker is
  // disabled with an explanatory tooltip (#248).
  const reactionWindowClosed = isReactionWindowClosed(
    (conversation as A).account?.type as string | undefined,
    messages,
    Date.now(),
  );

  const threadInner = (
    <>
      <ConversationHeader conversation={conversation} />
      <MessageList
        conversationId={id}
        messages={messages}
        isLoading={isLoadingMessages && messages.length === 0}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onRetry={onRetry}
        currentOperatorId={currentOperatorId}
        canReact={conversation.canReact}
        reactionWindowClosed={reactionWindowClosed}
        onReact={onReact}
      />
      <MessageComposer
        disabled={isResolved}
        disabledReason={
          isResolved ? t("conversations.composer.disabledResolved") : undefined
        }
        isSending={send.isPending}
        onSubmit={onSend}
      />
    </>
  );

  const sidebar = (
    <CustomerSidePanel
      customerId={customerId}
      conversationId={id}
      isOpen={sidebarOpen}
      onToggle={toggleSidebar}
      onViewMessage={scrollToMessage}
    />
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {sidebarOpen ? (
        // Open: thread and customer panel share a resizable split (persisted).
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="conversations:detail"
        >
          <ResizablePanel id="thread" order={1} defaultSize={72} minSize={45}>
            <div className="flex h-full min-w-0 flex-col overflow-hidden">
              {threadInner}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="customer"
            order={2}
            defaultSize={28}
            minSize={20}
            maxSize={45}
          >
            {sidebar}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        // Collapsed: thread fills the space beside the thin customer rail.
        <>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {threadInner}
          </div>
          {sidebar}
        </>
      )}
    </div>
  );
}
