import type { Filter } from "@/components/table/data-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useSkillTableFilters(): Filter[] {
  const { t } = useTranslation();

  return useMemo<Filter[]>(
    () => [
      {
        key: "source",
        label: t("skills.list.filters.source"),
        type: "select",
        options: [
          { label: t("skills.tabs.mySkills"), value: "workspace" },
          { label: t("skills.tabs.templates"), value: "template" },
        ],
        multiple: false,
        searchable: false,
      },
    ],
    [t],
  );
}
