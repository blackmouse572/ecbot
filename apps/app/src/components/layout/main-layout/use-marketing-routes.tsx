import { useWorkspace } from "@/hooks/api/workspace";
import { Link } from "@medusajs/icons";
import type { INavItem } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/routes";

/** The sidebar's Tiếp thị group: tools for shops to market to their customers. */
export const useMarketingRoutes = (): Omit<INavItem, "pathname">[] => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const baseUrl = `/${workspace?.slug}`;

  return [
    {
      label: t("customerSources.title"),
      to: `${baseUrl}/${ROUTES.CustomerSources}`,
      icon: <Link />,
      ability: {
        action: "manage",
        subject: "CUSTOMER",
      },
    },
  ];
};
