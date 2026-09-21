import { Button, Select, Text } from "@medusajs/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import {
  useConversations,
  type ConversationGetResponseDto,
  type ConversationStatus,
} from "@/hooks/api/conversations";
import { useChatbots } from "@/hooks/api/chatbot";
import { useAccounts } from "@/hooks/api/accounts";
import { usePendingMergeCustomerIds } from "@/hooks/api/customer-merge-suggestions";
import { useWorkspace } from "@/hooks/api/workspace";
import { ROUTES } from "@/routes";
import {
  CONVERSATION_FILTER_PREFIX,
  ConversationListFilters,
  type GroupBy,
} from "./conversation-list-filters";
import { ConversationListItem } from "./conversation-list-item";
import { ConversationListSkeleton } from "./conversation-list-skeleton";
import { ArrowPath } from "@medusajs/icons";

const LAST_VIEWED_KEY = "conversations.lastViewedAt";
const GROUP_BY_KEY = "conversations.groupBy";
const GROUP_OPTIONS: GroupBy[] = ["none", "account", "chatbot"];

const readLastViewed = (id: string): number => {
  try {
    const raw = localStorage.getItem(`${LAST_VIEWED_KEY}.${id}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
};

const readGroupBy = (): GroupBy => {
  try {
    const raw = localStorage.getItem(GROUP_BY_KEY);
    return raw === "account" || raw === "chatbot" ? raw : "none";
  } catch {
    return "none";
  }
};

export const ConversationList = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { id: activeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>(readGroupBy);

  const handleGroupByChange = (value: GroupBy) => {
    setGroupBy(value);
    try {
      localStorage.setItem(GROUP_BY_KEY, value);
    } catch {
      /* ignore persistence failures */
    }
  };

  const p = CONVERSATION_FILTER_PREFIX;
  const statusFilter =
    (searchParams.get(`${p}_status`) as ConversationStatus | null) ?? undefined;
  const chatbotFilter = searchParams.get(`${p}_chatbot`) ?? undefined;
  const accountFilter = searchParams.get(`${p}_account`) ?? undefined;

  const query = useMemo(
    () => ({
      search: search || undefined,
      perPage: 50,
      page: 1,
      orderBy: "lastMessageAt",
      orderDirection: "DESC" as const,
      status: statusFilter ? [statusFilter] : undefined,
      chatbot: chatbotFilter || undefined,
      account: accountFilter || undefined,
    }),
    [search, statusFilter, chatbotFilter, accountFilter],
  );

  const { conversations, refetch, isRefetching, isLoading, isError } =
    useConversations(query);
  const { chatbots } = useChatbots({ perPage: 100 } as never);
  const { accounts } = useAccounts({ perPage: 100 } as never);
  const { customerIds: pendingMergeCustomerIds } = usePendingMergeCustomerIds();
  const basePath = `/${workspace?.slug}/${ROUTES.Conversations}`;

  const showChatbot = groupBy !== "chatbot";

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<
      string,
      { label: string; items: ConversationGetResponseDto[] }
    >();
    for (const c of conversations) {
      const entity = (groupBy === "chatbot" ? c.chatbot : c.account) as
        { id?: string; name?: string } | undefined;
      const key = entity?.id ?? "__none__";
      const label = entity?.name ?? t("conversations.list.groupBy.unassigned");
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(c);
    }
    return Array.from(map.values());
  }, [conversations, groupBy, t]);

  const renderItem = (c: ConversationGetResponseDto) => {
    const handoffMs = (c as A).handoffAt
      ? new Date((c as A).handoffAt).getTime()
      : 0;
    const hasNewHandoff =
      (c as A).botEnabled === false &&
      handoffMs > 0 &&
      handoffMs > readLastViewed(c.id);
    const customerId = (c as A).customerId as string | undefined;
    const hasMergeSuggestion =
      !!customerId && pendingMergeCustomerIds.has(customerId);
    return (
      <li key={c.id}>
        <ConversationListItem
          conversation={c}
          basePath={basePath}
          isActive={activeId === c.id}
          hasNewHandoff={hasNewHandoff}
          showChatbot={showChatbot}
          hasMergeSuggestion={hasMergeSuggestion}
        />
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <Text size="large" weight="plus">
          {t("conversations.title")}
        </Text>
        <Select
          size="small"
          value={groupBy}
          onValueChange={(v) => handleGroupByChange(v as GroupBy)}
        >
          <Select.Trigger className="w-auto min-w-[130px]">
            <Select.Value
              placeholder={t("conversations.list.filter.groupBy")}
            />
          </Select.Trigger>
          <Select.Content>
            {GROUP_OPTIONS.map((opt) => (
              <Select.Item key={opt} value={opt}>
                {t(`conversations.list.groupBy.${opt}`)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      <ConversationListFilters
        search={search}
        onSearchChange={setSearch}
        chatbots={chatbots ?? []}
        accounts={accounts ?? []}
      />
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : isError ? (
          <div className="text-ui-fg-error gap-2 flex flex-col items-center justify-center h-full">
            <p>{t("conversations.errors.loadFailed")}</p>
            <Button
              variant="secondary"
              size="small"
              className="ml-4"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <ArrowPath />
              {t("actions.tryAgain")}
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-ui-fg-subtle p-6 text-center">
            <Text size="small">{t("conversations.list.empty")}</Text>
          </div>
        ) : groups ? (
          groups.map((group) => (
            <div key={group.label}>
              <div className="bg-ui-bg-base border-ui-border-base sticky top-0 flex items-center justify-between border-b px-4 py-1.5">
                <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                  {group.label}
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {group.items.length}
                </Text>
              </div>
              <ul className="flex flex-col">{group.items.map(renderItem)}</ul>
            </div>
          ))
        ) : (
          <ul className="flex flex-col">{conversations.map(renderItem)}</ul>
        )}
      </div>
    </div>
  );
};
