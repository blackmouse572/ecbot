import {
  DataTableFilter,
  type Filter,
} from "@/components/table/data-table/data-table-filter";
import { useMarketplaceCategories } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Input } from "@medusajs/ui";
import uniqBy from "lodash/uniqBy";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useDebounceCallback } from "usehooks-ts";

type MarketplaceProvider = "composio" | "eccho";

export function MarketplaceToolbar() {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const provider = (searchParams.get("provider") ??
    "composio") as MarketplaceProvider;

  const { categories } = useMarketplaceCategories(workspaceSlug, {
    enabled: provider === "composio",
  });

  const filterDefs = useMemo<Filter[]>(() => {
    const defs: Filter[] = [
      {
        key: "provider",
        label: t("tools.marketplace.filters.provider"),
        type: "select",
        options: [
          {
            label: t("tools.marketplace.providerTab.composio"),
            value: "composio",
          },
          {
            label: `${t("tools.marketplace.providerTab.eccho")} · ${t("tools.marketplace.providerTab.ecchoComingSoon")}`,
            value: "eccho",
          },
        ],
      },
    ];
    if (categories.length > 0) {
      defs.push({
        key: "category",
        label: t("tools.marketplace.filters.category"),
        type: "select",
        searchable: true,
        options: uniqBy(
          categories.map((c) => ({ label: c.name, value: c.id })),
          "value",
        ),
      });
    }
    return defs;
  }, [categories, t]);

  const handleSearchChange = useDebounceCallback((value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("search", value);
        else next.delete("search");
        next.set("page", "1");
        return next;
      },
      { replace: true },
    );
  }, 300);

  return (
    <div className="flex flex-col gap-2 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <Input
        type="search"
        size="small"
        autoComplete="off"
        placeholder={t("tools.marketplace.searchPlaceholder")}
        defaultValue={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-sm"
      />
      <DataTableFilter filters={filterDefs} />
    </div>
  );
}
