import type { Filter } from "@/components/table/data-table";
import { defaultNs } from "@/i18n";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/** Static half of the status facet — the only one the members list has. */
const STATUS = { key: "status", type: "select", multiple: false } as const;

export const useMemberTableFilters = (): Filter[] => {
  const { t } = useTranslation(defaultNs);

  return useMemo(() => {
    const options = [
      ["ACTIVE", t("accounts.details.statuses.active.label")],
      ["INACTIVE", t("accounts.details.statuses.inactive.label")],
      ["BLOCKED", t("accounts.details.statuses.blocked.label")],
    ].map(([value, label]) => ({ value, label }));

    return [
      { ...STATUS, searchable: true, label: t("fields.status"), options },
    ];
  }, [t]);
};
