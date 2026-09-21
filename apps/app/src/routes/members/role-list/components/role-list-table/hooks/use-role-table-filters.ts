import type { Filter } from "@/components/table/data-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useRoleTableFilters(): Filter[] {
  const { t } = useTranslation();

  const filters = useMemo<Filter[]>(
    () => [
      {
        key: "status",
        label: t("fields.status"),
        type: "select",
        options: [
          {
            label: t("accounts.details.statuses.active.label"),
            value: "true",
          },
          {
            label: t("accounts.details.statuses.inactive.label"),
            value: "false",
          },
        ],
        multiple: false,
        searchable: true,
      },
    ],
    [t],
  );

  return filters;
}
