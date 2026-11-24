import {
  useFreeWindowLeft,
  useMarketingDate,
  useMarketingEventText,
} from "@/components/customer-marketing";
import { useConversations } from "@/hooks/api/conversations";
import { useCustomerMarketing } from "@/hooks/api/customer-marketing";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useCustomerOrderSummary, useOrders } from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ORDER_DEFAULT_CURRENCY } from "@/routes/orders/constants";
import { formatMoney, itemsSummary } from "@/routes/orders/utils";
import { useAbility } from "@repo/auth";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { StatTile } from "./stat-tile";

const KEY = "customers.detail.stats";

/** What the customer spent, when they last bought and wrote, and whether offers may go out. */
export const CustomerStats: FC<{ customerId: string }> = ({ customerId }) => {
  const { t, i18n } = useTranslation();
  const { flags } = useFeatureFlags();
  const ability = useAbility();
  const { workspaceSlug } = useWorkspaceParams();
  const formatDate = useMarketingDate();
  const toText = useMarketingEventText();
  const windowLeft = useFreeWindowLeft();
  const canReadOrders = flags.orders && ability.can("read", "ORDER");

  const { summary } = useCustomerOrderSummary(
    workspaceSlug,
    canReadOrders ? customerId : "",
  );
  // Same query as the Hoạt động card, so it comes from the cache.
  const { orders } = useOrders(
    workspaceSlug,
    { customer: customerId, perPage: 100 },
    { enabled: canReadOrders },
  );
  const { conversations } = useConversations({
    customer: customerId,
    perPage: 100,
    orderBy: "lastMessageAt",
    orderDirection: "DESC",
  });
  const { marketing } = useCustomerMarketing(customerId);

  const lastOrder = orders
    .filter((order) => order.status === "CONFIRMED")
    .sort(
      (a, b) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )[0];
  const latest = conversations[0];
  const lastMessageAt = latest?.lastMessageAt;
  const window = marketing?.freeWindows.find(
    (w) => w.channel === (latest?.account as A)?.type,
  );

  const windowHint = () => {
    const time = windowLeft(window?.openUntil);

    if (time === undefined) return undefined;

    return time === null
      ? t(`${KEY}.windowClosed`)
      : t(`${KEY}.windowOpen`, { time });
  };

  const consentEvent = marketing?.permissionEvent;
  const consentReason = consentEvent ? toText(consentEvent).reason : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {canReadOrders && (
        <>
          <StatTile
            label={t(`${KEY}.spent`)}
            value={formatMoney(
              summary?.totalSpent ?? 0,
              ORDER_DEFAULT_CURRENCY,
              i18n.language,
            )}
            hint={t(`${KEY}.spentHint`, {
              count: summary?.confirmedOrders ?? 0,
            })}
          />
          <StatTile
            label={t(`${KEY}.lastOrder`)}
            value={
              lastOrder
                ? new Intl.DateTimeFormat(i18n.language, {
                    day: "numeric",
                    month: "numeric",
                  }).format(new Date(lastOrder.orderedAt))
                : "–"
            }
            hint={lastOrder ? itemsSummary(lastOrder) : t(`${KEY}.noOrders`)}
          />
        </>
      )}
      <StatTile
        label={t(`${KEY}.lastActive`)}
        value={lastMessageAt ? formatDate(lastMessageAt) : "–"}
        hint={windowHint()}
      />
      {marketing && (
        <StatTile
          label={t(`${KEY}.consent`)}
          value={t(`customerMarketing.permission.${marketing.permission}`)}
          hint={
            consentEvent &&
            [formatDate(consentEvent.createdAt), consentReason]
              .filter(Boolean)
              .join(", ")
          }
        />
      )}
    </div>
  );
};
