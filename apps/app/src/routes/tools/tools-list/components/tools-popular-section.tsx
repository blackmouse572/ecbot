import { useMarketplaceCatalog } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ArrowRightMini } from "@medusajs/icons";
import { Button, Container, Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ToolkitCard,
  type ToolkitCardData,
} from "../../marketplace/components/toolkit-card";

const POPULAR = { page: 1, perPage: 6 };

/** The store's first apps under the tool list, so adding one is one click. */
export const ToolsPopularSection = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { catalog } = useMarketplaceCatalog(workspaceSlug, POPULAR);
  const toolkits: ToolkitCardData[] = Array.isArray(catalog) ? catalog : [];
  const store = `/${workspaceSlug}/tools/marketplace`;

  if (toolkits.length === 0) return null;

  return (
    <Container className="flex flex-col gap-y-3 px-6 py-4">
      <div className="flex items-center justify-between">
        <Heading level="h2">{t("tools.popular.title")}</Heading>
        <Button size="small" variant="transparent" asChild>
          <Link to={store}>
            {t("tools.popular.seeAll")}
            <ArrowRightMini />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {toolkits.map((toolkit) => (
          <ToolkitCard
            key={toolkit.slug}
            toolkit={toolkit}
            to={`${store}/${encodeURIComponent(toolkit.slug)}`}
          />
        ))}
      </div>
    </Container>
  );
};
