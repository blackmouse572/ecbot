import type { OrderGetResponseDto } from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { OrderSourceLabel } from "@/routes/orders/components/order-source-label";
import { formatMoney, itemsSummary } from "@/routes/orders/utils";
import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/** One confirmed order in the panel: code, date, items, total and where it came from. */
export const ConfirmedOrderRow: FC<{ order: OrderGetResponseDto }> = ({
  order,
}) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  return (
    <li className="flex flex-col gap-y-1 px-3 py-2.5">
      <div className="flex items-center justify-between gap-x-2">
        <Link
          to={`/${workspaceSlug}/orders/${order.id}`}
          className="txt-compact-small-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover truncate"
        >
          {order.code}
        </Link>
        <Text size="xsmall" className="text-ui-fg-muted shrink-0 tabular-nums">
          {new Intl.DateTimeFormat(i18n.language, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(order.orderedAt))}
        </Text>
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        {itemsSummary(order) || t("orders.noItems")}
      </Text>
      <div className="flex items-center justify-between gap-x-2">
        <Text size="small" weight="plus" className="tabular-nums">
          {formatMoney(order.total, order.currency, i18n.language)}
        </Text>
        <OrderSourceLabel source={order.source} />
      </div>
    </li>
  );
};
