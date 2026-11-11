import { Heading, Tabs, Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type OrdersTab = "orders" | "groups";

/**
 * The page head both tabs share (frames 14 and 14d): title, description, the
 * tab's own actions, then the Đơn hàng | Nhóm hàng switch. Each tab is a route,
 * so the switch is a pair of links.
 */
export const OrdersPageHeader: FC<{
  tab: OrdersTab;
  actions: ReactNode;
}> = ({ tab, actions }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-4 px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading level="h1">{t("orders.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("orders.description")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">{actions}</div>
      </div>
      <Tabs value={tab}>
        <Tabs.List>
          <Tabs.Trigger value="orders" asChild>
            <Link to={tab === "orders" ? "." : ".."}>
              {t("orders.tabs.orders")}
            </Link>
          </Tabs.Trigger>
          <Tabs.Trigger value="groups" asChild>
            <Link to={tab === "groups" ? "." : "groups"}>
              {t("orders.tabs.groups")}
            </Link>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>
    </div>
  );
};
