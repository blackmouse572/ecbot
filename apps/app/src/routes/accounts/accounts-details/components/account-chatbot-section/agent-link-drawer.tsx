import { AgentLinkRow } from "@/components/account-connect/agent-link-row";
import { AgentLinkRowSkeletons } from "@/components/account-connect/agent-link-row-skeletons";
import { useInfiniteChatbotList } from "@/hooks/api/chatbot";
import { MagnifyingGlass } from "@medusajs/icons";
import { Button, Drawer, Input, Text } from "@medusajs/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
};

const SEARCH_DEBOUNCE_MS = 250;

/** Pick one of the workspace's agents to answer on this channel. */
export const AgentLinkDrawer = ({ isOpen, onClose, accountId }: Props) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const {
    chatbots,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteChatbotList(search);
  const available = chatbots.filter((c) => c.status !== "archived");
  const observer = useRef<IntersectionObserver | null>(null);

  // The drawer stays mounted when closed, so clear the query for the next open.
  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setSearch("");
    }
  }, [isOpen]);

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
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <AgentLinkRowSkeletons count={5} />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-y-2 py-6">
              <Text size="small" className="text-ui-fg-muted text-center">
                {t("accounts.details.noChatbot.loadFailed")}
              </Text>
              <Button
                size="small"
                variant="secondary"
                onClick={() => refetch()}
              >
                {t("actions.tryAgain")}
              </Button>
            </div>
          ) : available.length === 0 && !hasNextPage ? (
            <Text size="small" className="text-ui-fg-muted text-center py-6">
              {t("accounts.details.noChatbot.noneAvailable")}
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {available.map((chatbot) => (
                <AgentLinkRow
                  key={chatbot.id}
                  chatbot={chatbot}
                  accountIds={[accountId]}
                  actionLabel={t("actions.add")}
                  onLinked={onClose}
                />
              ))}
              {isFetchingNextPage && <AgentLinkRowSkeletons count={2} />}
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
