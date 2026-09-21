import type { Filter } from "@/components/table/data-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useToolTableFilters(): Filter[] {
  const { t } = useTranslation();

  return useMemo<Filter[]>(
    () => [
      {
        key: "kind",
        label: t("tools.list.filters.kind"),
        type: "select",
        options: [
          { label: "HTTP", value: "HTTP" },
          { label: "MCP", value: "MCP" },
        ],
        multiple: false,
        searchable: false,
      },
      {
        key: "status",
        label: t("tools.list.filters.status"),
        type: "select",
        options: [
          {
            label: t("tools.list.filters.statusOptions.active"),
            value: "ACTIVE",
          },
          {
            label: t("tools.list.filters.statusOptions.needsreauth"),
            value: "NEEDS_REAUTH",
          },
          {
            label: t("tools.list.filters.statusOptions.expired"),
            value: "EXPIRED",
          },
          {
            label: t("tools.list.filters.statusOptions.revoked"),
            value: "REVOKED",
          },
        ],
        multiple: false,
        searchable: false,
      },
      {
        key: "mcpProvider",
        label: t("tools.list.filters.mcpProvider"),
        type: "select",
        options: [
          { label: "COMPOSIO", value: "COMPOSIO" },
          { label: "ECCHO", value: "ECCHO" },
          { label: "OPERATOR", value: "OPERATOR" },
        ],
        multiple: false,
        searchable: false,
      },
    ],
    [t],
  );
}
