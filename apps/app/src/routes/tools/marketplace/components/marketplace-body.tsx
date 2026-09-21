import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Text } from "@medusajs/ui";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ToolkitCard, type ToolkitCardData } from "./toolkit-card";

type MarketplaceBodyProps = {
  toolkits: ToolkitCardData[];
  isLoading: boolean;
  renderItem?: (toolkit: ToolkitCardData) => ReactNode;
};

export function MarketplaceBody({
  toolkits,
  isLoading,
  renderItem,
}: MarketplaceBodyProps) {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  return (
    <div className="px-6 py-4">
      {isLoading ? (
        <div className="py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.list.loading")}
          </Text>
        </div>
      ) : toolkits.length === 0 ? (
        <div className="py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.marketplace.noResults")}
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {toolkits.map((toolkit) =>
            renderItem ? (
              renderItem(toolkit)
            ) : (
              <ToolkitCard
                key={toolkit.slug}
                toolkit={toolkit}
                to={`/${workspaceSlug}/tools/marketplace/${encodeURIComponent(toolkit.slug)}`}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
