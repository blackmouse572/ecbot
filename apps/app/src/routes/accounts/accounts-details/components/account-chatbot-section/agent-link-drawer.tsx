import {
  useInfiniteChatbotList,
  useLinkChatbotAccount,
} from "@/hooks/api/chatbot";
import { CHATBOT_TYPE_CONFIG } from "@/routes/chatbot/constants";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { ChatbotTypeBadge } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-badge";
import { MagnifyingGlass } from "@medusajs/icons";
import { Button, Drawer, Input, Text, toast } from "@medusajs/ui";
import type { ChatbotLinkAccountResponseDto } from "@repo/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
};

type RowProps = {
  chatbot: { id: string; name: string; avatar?: string; type?: string };
  accountId: string;
  onLinked: () => void;
};

/** One agent in the picker; owns the link mutation, which is keyed by agent. */
const AgentRow = ({ chatbot, accountId, onLinked }: RowProps) => {
  const { t } = useTranslation();
  const link = useLinkChatbotAccount(chatbot.id);
  const config =
    CHATBOT_TYPE_CONFIG[chatbot.type as keyof typeof CHATBOT_TYPE_CONFIG];

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
      <div className="flex min-w-0 flex-col gap-y-1">
        <ChatbotNameCell
          size="small"
          name={chatbot.name}
          avatar={chatbot.avatar}
        />
        {config && <ChatbotTypeBadge config={config} size="xsmall" clamp />}
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

const SEARCH_DEBOUNCE_MS = 250;

/** Pick one of the workspace's agents to answer on this channel. */
export const AgentLinkDrawer = ({ isOpen, onClose, accountId }: Props) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const { chatbots, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteChatbotList(search);
  const available = chatbots.filter((c) => c.status !== "archived");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSearch(input.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [input]);

  // The sentinel sits under the last row; reaching it loads the next page.
  // A callback ref, because the drawer content mounts only once it is open.
  const sentinel = useCallback(
    (node: HTMLDivElement | null) => {
      observer.current?.disconnect();
      if (!node || !hasNextPage || isFetchingNextPage) return;
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      });
      observer.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {t("accounts.details.noChatbot.drawerTitle")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-fg-muted" />
            <Input
              className="pl-9"
              placeholder={t("app.search.label")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          {available.length === 0 && !hasNextPage ? (
            <Text size="small" className="text-ui-fg-muted text-center py-6">
              {t("accounts.details.noChatbot.noneAvailable")}
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {available.map((chatbot) => (
                <AgentRow
                  key={chatbot.id}
                  chatbot={chatbot}
                  accountId={accountId}
                  onLinked={onClose}
                />
              ))}
              <div ref={sentinel} className="h-px" />
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
};
