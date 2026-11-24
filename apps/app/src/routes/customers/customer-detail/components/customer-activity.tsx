import { useConversations } from "@/hooks/api/conversations";
import { useCustomerMarketingEvents } from "@/hooks/api/customer-marketing";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useOrders } from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { useAbility } from "@repo/auth";
import { useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { buildActivity } from "../build-activity";
import {
  CUSTOMER_ACTIVITY_FILTERS,
  CUSTOMER_ACTIVITY_PAGE,
} from "../constants";
import type { CustomerActivityFilter } from "../types";
import { ActivityRow } from "./activity-row";

const KEY = "customers.detail.activity";

/**
 * Everything that happened with the customer, newest first, in one list.
 * `only` pins one kind, for a tab, and drops the filter buttons.
 */
export const CustomerActivity: FC<{
  customerId: string;
  only?: CustomerActivityFilter;
}> = ({ customerId, only }) => {
  const { t } = useTranslation();
  const { flags } = useFeatureFlags();
  const ability = useAbility();
  const { workspaceSlug } = useWorkspaceParams();
  const [picked, setFilter] = useState<CustomerActivityFilter>("all");
  const filter = only ?? picked;
  const [shown, setShown] = useState(CUSTOMER_ACTIVITY_PAGE);

  const canReadOrders = flags.orders && ability.can("read", "ORDER");
  // Same query as the conversations list and the contact card.
  const { conversations } = useConversations({
    customer: customerId,
    perPage: 100,
    orderBy: "lastMessageAt",
    orderDirection: "DESC",
  });
  const { orders } = useOrders(
    workspaceSlug,
    { customer: customerId, perPage: 100 },
    { enabled: canReadOrders },
  );
  const { events } = useCustomerMarketingEvents(customerId);

  const items = useMemo(
    () =>
      buildActivity(
        { conversations, orders: canReadOrders ? orders : [], events },
        filter,
      ),
    [conversations, orders, events, filter, canReadOrders],
  );
  const filters = CUSTOMER_ACTIVITY_FILTERS.filter(
    (value) => value !== "order" || canReadOrders,
  );

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level="h2">
          {only ? t(`${KEY}.filters.${only}`) : t(`${KEY}.title`)}
        </Heading>
        {!only && (
          <div className="flex flex-wrap gap-1">
            {filters.map((value) => (
              <Button
                key={value}
                size="small"
                variant={filter === value ? "secondary" : "transparent"}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setShown(CUSTOMER_ACTIVITY_PAGE);
                }}
              >
                {t(`${KEY}.filters.${value}`)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <Text size="small" className="text-ui-fg-muted">
          {t(`${KEY}.empty`)}
        </Text>
      ) : (
        <ul className="flex flex-col gap-y-4">
          {items.slice(0, shown).map((item) => (
            <ActivityRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </ul>
      )}

      {items.length > shown && (
        <Button
          size="small"
          variant="transparent"
          className="self-center"
          onClick={() => setShown((count) => count + CUSTOMER_ACTIVITY_PAGE)}
        >
          {t(`${KEY}.more`)}
        </Button>
      )}
    </Container>
  );
};
