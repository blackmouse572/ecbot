import { MarketingStageBadge } from "@/components/customer-marketing";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import type { ContactPointGetResponseDto } from "@/hooks/api/contact-points";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import { useCustomerMarketing } from "@/hooks/api/customer-marketing";
import type { CustomerGetResponseDto } from "@/hooks/api/customers";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useDate } from "@/hooks/use-date";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { CustomerActions } from "@/routes/conversations/customer-side-panel/components/customer-actions";
import { ChatBubble, Plus } from "@medusajs/icons";
import {
  Avatar,
  Button,
  Container,
  DropdownMenu,
  Heading,
  Text,
} from "@medusajs/ui";
import { useAbility } from "@repo/auth";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useCustomerDisplayName } from "./use-customer-display-name";

type Props = {
  customer: CustomerGetResponseDto;
  contactPoints: ContactPointGetResponseDto[];
  conversations: ConversationGetResponseDto[];
  onErased: () => void;
  // The tab list, which sits under the name.
  children: ReactNode;
};

/** Who the customer is, where they came from, and what to do next. */
export const CustomerDetailHead: FC<Props> = ({
  customer,
  contactPoints,
  conversations,
  onErased,
  children,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const ability = useAbility();
  const { getFullDate } = useDate();
  const { workspaceSlug } = useWorkspaceParams();
  const { marketing } = useCustomerMarketing(customer.id);

  const name = useCustomerDisplayName(customer.id);
  const channels = [...new Set(contactPoints.map((cp) => cp.platform))];
  const latest = conversations[0];
  const source = flags.customerSources ? marketing?.firstSource : null;
  const addOrderHref =
    flags.orders && ability.can("create", "ORDER")
      ? `/${workspaceSlug}/orders/create?customer=${customer.id}`
      : null;

  return (
    <Container className="flex flex-col gap-y-4 px-6 pb-3 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-x-3">
          <Avatar
            size="large"
            variant="rounded"
            fallback={name.slice(0, 1).toUpperCase()}
          />
          <div className="flex min-w-0 flex-col gap-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2">
              <Heading level="h1" className="min-w-0 break-words">
                {name}
              </Heading>
              {marketing && (
                <MarketingStageBadge
                  stage={marketing.stage}
                  dormant={marketing.dormant}
                />
              )}
            </div>
            <Text
              size="small"
              className="text-ui-fg-subtle flex flex-wrap items-center gap-x-1.5"
            >
              {channels.map((platform) => (
                <span key={platform} className="flex items-center gap-x-1">
                  <PlatformIcon type={platform as A} size={14} />
                  {channelOf(platform as A).label}
                </span>
              ))}
              {channels.length > 0 && <span aria-hidden>·</span>}
              <span>
                {t("customers.detail.since", {
                  date: getFullDate(new Date(customer.createdAt)),
                })}
              </span>
              {source && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {t("customers.detail.cameFrom")}{" "}
                    <Link
                      to={`/${workspaceSlug}/${ROUTES.CustomerSources}/${source.sourceId}`}
                      className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                    >
                      {source.sourceName}
                    </Link>
                  </span>
                </>
              )}
            </Text>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-x-2">
          {addOrderHref && (
            <Button
              size="small"
              variant="secondary"
              className="hidden sm:inline-flex"
              asChild
            >
              <Link to={addOrderHref}>
                <Plus />
                {t("customers.detail.addOrder")}
              </Link>
            </Button>
          )}
          {latest && (
            <Button size="small" variant="primary" asChild>
              <Link
                to={`/${workspaceSlug}/${ROUTES.Conversations}/${latest.id}`}
              >
                <ChatBubble />
                {t("customers.detail.openConversation")}
              </Link>
            </Button>
          )}
          {/* The ⋯ menu always comes last; on a phone it holds Thêm đơn too. */}
          <CustomerActions
            customerId={customer.id}
            customerName={customer.name}
            onErased={onErased}
          >
            {addOrderHref && (
              <>
                <DropdownMenu.Item
                  className="sm:hidden"
                  onClick={() => navigate(addOrderHref)}
                >
                  {t("customers.detail.addOrder")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="sm:hidden" />
              </>
            )}
          </CustomerActions>
        </div>
      </div>
      {children}
    </Container>
  );
};
