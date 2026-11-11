import { useCustomerOrderSummary, useOrders } from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ORDER_DEFAULT_CURRENCY } from "@/routes/orders/constants";
import { formatMoney, orderedAtLabel } from "@/routes/orders/utils";
import { PlusMini } from "@medusajs/icons";
import { Badge, Button, Heading, Skeleton, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { ConfirmedOrderRow } from "./confirmed-order-row";
import { PendingOrderCard } from "./pending-order-card";

const LATEST = 3;

/**
 * Frame 13c, Đơn hàng on the customer panel: what the customer bought, the
 * chat orders still to confirm, and the latest confirmed orders.
 */
export const OrdersSection: FC<{ customerId: string }> = ({ customerId }) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const location = useLocation();

  const { summary } = useCustomerOrderSummary(workspaceSlug, customerId);

  const pending = useOrders(workspaceSlug, {
    customer: customerId,
    status: "PENDING",
  });

  const confirmed = useOrders(workspaceSlug, {
    customer: customerId,
    status: "CONFIRMED",
    perPage: LATEST,
  });

  const currency = confirmed.orders[0]?.currency ?? ORDER_DEFAULT_CURRENCY;

  const last = summary?.lastOrderedAt
    ? orderedAtLabel(summary.lastOrderedAt, i18n.language)
    : null;

  const empty =
    summary?.confirmedOrders === 0 &&
    !pending.isLoading &&
    !pending.orders.length;

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center justify-between gap-x-2">
        <div className="flex items-center gap-x-2">
          <Heading level="h3">{t("orders.panel.title")}</Heading>
          <Badge size="2xsmall" color="blue">
            {t("app.nav.marketing.new")}
          </Badge>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link
            to={`/${workspaceSlug}/orders/create?customer=${customerId}`}
            state={{ from: `${location.pathname}${location.search}` }}
          >
            <PlusMini />
            {t("orders.panel.add")}
          </Link>
        </Button>
      </div>

      {!summary ? (
        <Skeleton className="h-14 w-full rounded-lg" />
      ) : empty ? (
        <Text size="small" className="text-ui-fg-muted">
          {t("orders.panel.none")}
        </Text>
      ) : (
        // Stacked rows in the narrow panel, three columns once it is widened.
        <div className="@container">
          <dl className="shadow-borders-base divide-ui-border-base grid grid-cols-1 divide-y rounded-lg @xs:grid-cols-3 @xs:divide-x @xs:divide-y-0">
            {[
              {
                value: summary.confirmedOrders.toLocaleString(i18n.language),
                label: t("orders.panel.stats.orders"),
              },
              {
                value: formatMoney(summary.totalSpent, currency, i18n.language),
                label: t("orders.panel.stats.spent"),
              },
              {
                value: !last
                  ? "–"
                  : last.when === "earlier"
                    ? last.date
                    : t(`orders.date.${last.when}`, { time: last.time }),
                label: t("orders.panel.stats.last"),
              },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex min-w-0 flex-row-reverse items-baseline justify-between gap-x-2 px-3 py-2 @xs:flex-col @xs:items-start @xs:justify-start"
              >
                <dd className="txt-compact-small-plus truncate tabular-nums">
                  {value}
                </dd>
                <dt className="txt-compact-xsmall text-ui-fg-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      )}

      {pending.orders.length > 0 && (
        <div className="flex flex-col gap-y-2">
          {pending.orders.map((order) => (
            <PendingOrderCard key={order.id} order={order} />
          ))}
          <Text size="xsmall" className="text-ui-fg-muted">
            {t("orders.panel.pendingHint")}
          </Text>
        </div>
      )}

      {confirmed.orders.length > 0 && (
        <>
          <ul className="shadow-borders-base divide-ui-border-base divide-y rounded-lg">
            {confirmed.orders.map((order) => (
              <ConfirmedOrderRow key={order.id} order={order} />
            ))}
          </ul>
          <div className="flex items-center justify-between gap-x-2">
            <Text size="xsmall" className="text-ui-fg-muted">
              {t("orders.panel.latest")}
            </Text>
            <Link
              to={`/${workspaceSlug}/orders?customer=${customerId}`}
              className="txt-compact-xsmall-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover shrink-0"
            >
              {t("orders.panel.viewAll")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
