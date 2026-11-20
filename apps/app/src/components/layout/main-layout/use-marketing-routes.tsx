import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useWorkspace } from "@/hooks/api/workspace";
import { ChartBar, Link } from "@medusajs/icons";
import type { INavItem } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/routes";

/** The sidebar's Tiếp thị group: tools for shops to market to their customers. */
export const useMarketingRoutes = (): Omit<INavItem, "pathname">[] => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { flags } = useFeatureFlags();
  const baseUrl = `/${workspace?.slug}`;
  const routes: Omit<INavItem, "pathname">[] = [];

  if (flags.marketing) {
    routes.push({
      label: t("marketing.overview.navTitle"),
      to: `${baseUrl}/${ROUTES.Marketing}`,
      icon: <ChartBar />,
      ability: {
        action: "read",
        subject: "CUSTOMER",
      },
    });
  }
  if (flags.customerSources) {
    routes.push({
      label: t("customerSources.title"),
      to: `${baseUrl}/${ROUTES.CustomerSources}`,
      icon: <Link />,
      ability: {
        action: "manage",
        subject: "CUSTOMER",
      },
    });
  }

  return routes;
};
