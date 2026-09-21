import type { Filter } from "@/components/table/data-table";
import { SESSION_STATUSES } from "@/modules/sessions";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useSessionTableFilters(): Filter[] {
  const { t } = useTranslation();

  return useMemo<Filter[]>(
    () => [
      {
        key: "status",
        label: t("fields.status"),
        type: "select",
        options: SESSION_STATUSES.map((status) => ({
          label: t(`sessions.status.${status}`),
          value: status,
        })),
        multiple: true,
      },
    ],
    [t],
  );
}
