import type { Filter } from "@/components/table/data-table";
import { useChatbots } from "@/hooks/api";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const FOLLOWUP_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "SKIPPED",
  "FAILED",
  "CANCELLED",
] as const;

export function useFollowupsTableFilters(): Filter[] {
  const { t } = useTranslation();
  const { chatbots } = useChatbots();

  const filters = useMemo<Filter[]>(
    () => [
      {
        key: "chatbot",
        label: t("followups.list.filters.chatbot"),
        type: "select",
        options:
          chatbots?.map((chatbot) => ({
            label: chatbot.name,
            value: chatbot.id,
          })) ?? [],
        multiple: false,
        searchable: true,
      },
      {
        key: "status",
        label: t("followups.list.filters.status"),
        type: "select",
        options: FOLLOWUP_STATUSES.map((status) => ({
          label: t(`followups.list.status.${status.toLowerCase()}`),
          value: status,
        })),
        multiple: false,
      },
    ],
    [chatbots, t],
  );

  return filters;
}
