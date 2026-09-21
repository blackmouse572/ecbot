import { useMarketplaceCatalog } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Container } from "@medusajs/ui";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { MarketplaceBody } from "./components/marketplace-body";
import { MarketplaceFooter } from "./components/marketplace-footer";
import { MarketplaceHeader } from "./components/marketplace-header";
import { MarketplaceToolbar } from "./components/marketplace-toolbar";
import type { ToolkitCardData } from "./components/toolkit-card";

type MarketplaceProvider = "composio" | "eccho";

const DEFAULT_PER_PAGE = 24;

export const MarketplaceList = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(
    searchParams.get("perPage") ?? String(DEFAULT_PER_PAGE),
  );
  const provider = (searchParams.get("provider") ??
    "composio") as MarketplaceProvider;
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === "") next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const { catalog, total, totalPage, isLoading } = useMarketplaceCatalog(
    workspaceSlug,
    { search, category, page, perPage },
    { enabled: provider === "composio" },
  );

  const toolkits: ToolkitCardData[] = useMemo(
    () => (Array.isArray(catalog) ? (catalog as ToolkitCardData[]) : []),
    [catalog],
  );

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("tools.marketplace.title")} - Ecbot</title>
      </Helmet>

      <Container className="p-0">
        <MarketplaceHeader />
        <MarketplaceToolbar />
        <MarketplaceBody toolkits={toolkits} isLoading={isLoading} />
        <MarketplaceFooter
          total={total}
          page={page}
          perPage={perPage}
          totalPage={totalPage}
          onNext={() => updateParams({ page: String(page + 1) })}
          onPrev={() => updateParams({ page: String(page - 1) })}
        />
      </Container>
    </div>
  );
};
