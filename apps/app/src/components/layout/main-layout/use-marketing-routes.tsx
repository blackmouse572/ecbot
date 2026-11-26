import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useWorkspace } from "@/hooks/api/workspace";
import { ChartBar, Link, PaperPlane } from "@medusajs/icons";
import type { INavItem } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { ROUTES } from "@/routes";

/** The sidebar's Tiếp thị group: tools for shops to market to their customers. */
export const useMarketingRoutes = (): Omit<INavItem, "pathname">[] => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { flags } = useFeatureFlags();
  const { pathname } = useLocation();
  const baseUrl = `/${workspace?.slug}`;
  const sendsUrl = `${baseUrl}/${ROUTES.Marketing}/sends`;
  const routes: Omit<INavItem, "pathname">[] = [];

  if (flags.marketing) {
    routes.push({
      label: t("marketing.overview.navTitle"),
      to: `${baseUrl}/${ROUTES.Marketing}`,
      icon: <ChartBar />,
      // Tổng quan's drawers live under it, but Đã gửi has its own link.
      end: pathname.startsWith(sendsUrl),
      ability: {
        action: "read",
        subject: "MARKETING",
      },
    });
    routes.push({
      label: t("marketing.sends.navTitle"),
      to: sendsUrl,
      icon: <PaperPlane />,
      ability: {
        action: "read",
        subject: "MARKETING",
      },
    });
  }
  if (flags.customerSources) {
    routes.push({
      label: t("customerSources.title"),
      to: `${baseUrl}/${ROUTES.CustomerSources}`,
      icon: <Link />,
      ability: {
        action: "read",
        subject: "MARKETING",
      },
    });
  }

  return routes;
};
