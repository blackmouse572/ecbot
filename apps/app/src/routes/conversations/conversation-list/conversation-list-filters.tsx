import { Input } from "@medusajs/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DataTableFilter,
  type Filter,
} from "@/components/table/data-table/data-table-filter/data-table-filter";

export type GroupBy = "none" | "account" | "chatbot";

export const CONVERSATION_FILTER_PREFIX = "conv";

interface Option {
  id: string;
  name?: string;
}

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  chatbots: Option[];
  accounts: Option[];
}

export const ConversationListFilters = ({
  search,
  onSearchChange,
  chatbots,
  accounts,
}: Props) => {
  const { t } = useTranslation();

  const filters = useMemo<Filter[]>(
    () => [
      {
        key: "status",
        label: t("conversations.list.filter.status"),
        type: "select",
        options: [
          { label: t("conversations.status.lifecycle.OPEN"), value: "OPEN" },
          {
            label: t("conversations.status.lifecycle.RESOLVED"),
            value: "RESOLVED",
          },
        ],
      },
      {
        key: "chatbot",
        label: t("conversations.list.filter.chatbot"),
        type: "select",
        searchable: true,
        options: chatbots.map((c) => ({ label: c.name ?? c.id, value: c.id })),
      },
      {
        key: "account",
        label: t("conversations.list.filter.account"),
        type: "select",
        searchable: true,
        options: accounts.map((a) => ({ label: a.name ?? a.id, value: a.id })),
      },
    ],
    [t, chatbots, accounts],
  );

  return (
    // Search and the filter button share one row; picked filters wrap below.
    <div className="border-ui-border-base flex flex-wrap items-center gap-2 border-b px-4 pb-3 pt-2">
      <div className="min-w-[160px] flex-1">
        <Input
          type="search"
          size="small"
          placeholder={t("conversations.list.search.placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <DataTableFilter
        filters={filters}
        prefix={CONVERSATION_FILTER_PREFIX}
        iconTrigger
        className="max-w-full"
      />
    </div>
  );
};
