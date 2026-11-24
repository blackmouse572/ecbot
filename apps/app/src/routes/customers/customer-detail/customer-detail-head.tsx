import type { ContactPointGetResponseDto } from "@/hooks/api/contact-points";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import type { CustomerGetResponseDto } from "@/hooks/api/customers";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useCustomerOrderSummary } from "@/hooks/api/orders";
import { useDate } from "@/hooks/use-date";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { ROUTES } from "@/routes/constants";
import { CustomerActions } from "@/routes/conversations/customer-side-panel/components/customer-actions";
import { ORDER_DEFAULT_CURRENCY } from "@/routes/orders/constants";
import { formatMoney } from "@/routes/orders/utils";
import { ChatBubbleLeftRight } from "@medusajs/icons";
import { Avatar, Button, Container, Heading, Text } from "@medusajs/ui";
import { useAbility } from "@repo/auth";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCustomerDisplayName } from "./use-customer-display-name";

type Props = {
  customer: CustomerGetResponseDto;
  contactPoints: ContactPointGetResponseDto[];
  conversations: ConversationGetResponseDto[];
  onErased: () => void;
};

/** Who the customer is, what they are worth, and a quick way back to the chat. */
export const CustomerDetailHead: FC<Props> = ({
  customer,
  contactPoints,
  conversations,
  onErased,
}) => {
  const { t, i18n } = useTranslation();
  const { flags } = useFeatureFlags();
  const ability = useAbility();
  const { getFullDate, getRelativeDate } = useDate();
  const { workspaceSlug } = useWorkspaceParams();
  const showSpend = flags.orders && ability.can("read", "ORDER");
  const { summary } = useCustomerOrderSummary(
    workspaceSlug,
    showSpend ? customer.id : "",
  );

  const name = useCustomerDisplayName(customer.id);
  const channels = [...new Set(contactPoints.map((cp) => cp.platform))];
  const latest = conversations[0];
  const lastActiveAt = (latest as A)?.lastMessageAt as string | undefined;

  const stats = [
    {
      label: t("customers.detail.stats.conversations"),
      value: String(conversations.length),
    },
    ...(showSpend
      ? [
          {
            label: t("customers.detail.stats.spent"),
            value: summary
              ? formatMoney(
                  summary.totalSpent,
                  ORDER_DEFAULT_CURRENCY,
                  i18n.language,
                )
              : "-",
          },
        ]
      : []),
    {
      label: t("customers.detail.stats.lastActive"),
      value: lastActiveAt ? getRelativeDate(new Date(lastActiveAt)) : "-",
    },
  ];

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 items-center gap-x-3">
          <Avatar size="large" fallback={name.slice(0, 1).toUpperCase()} />
          <div className="flex min-w-0 flex-col gap-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2">
              <Heading level="h1" className="min-w-0 break-words">
                {name}
              </Heading>
              <div className="flex items-center gap-x-1">
                {channels.map((platform) => (
                  <PlatformIcon key={platform} type={platform as A} size={16} />
                ))}
              </div>
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {t("customers.detail.since", {
                date: getFullDate(new Date(customer.createdAt)),
              })}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-x-2">
          <CustomerActions
            customerId={customer.id}
            customerName={customer.name}
            onErased={onErased}
          />
          {latest && (
            <Button size="small" variant="secondary" asChild>
              <Link
                to={`/${workspaceSlug}/${ROUTES.Conversations}/${latest.id}`}
              >
                <ChatBubbleLeftRight />
                {t("customers.detail.openConversation")}
              </Link>
            </Button>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 px-6 py-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-y-0.5">
            <Text size="xsmall" className="text-ui-fg-subtle" asChild>
              <dt>{stat.label}</dt>
            </Text>
            <Text size="large" weight="plus" className="tabular-nums" asChild>
              <dd>{stat.value}</dd>
            </Text>
          </div>
        ))}
      </dl>
    </Container>
  );
};
