import {
  useMarketingDate,
  useMarketingEventText,
} from "@/components/customer-marketing";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import type { MarketingEventGetResponseDto } from "@/hooks/api/customer-marketing";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { formatMoney, itemsSummary } from "@/routes/orders/utils";
import {
  ArrowUpRightMini,
  BellAlert,
  ChatBubble,
  CheckCircle,
  ExclamationCircle,
  Link as LinkIcon,
  PauseSolid,
  ShoppingBag,
} from "@medusajs/icons";
import { Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { CustomerActivityItem } from "../types";
import { ToneIcon, type Tone } from "./tone-icon";

const KEY = "customers.detail.activity";

const EVENT_LOOK: Record<
  MarketingEventGetResponseDto["kind"],
  { tone: Tone; icon: ReactNode }
> = {
  STAGE: { tone: "purple", icon: <ArrowUpRightMini /> },
  INTENT: { tone: "purple", icon: <ArrowUpRightMini /> },
  PERMISSION: { tone: "green", icon: <CheckCircle /> },
  CONSENT_ASKED: { tone: "blue", icon: <BellAlert /> },
  HOSTILE: { tone: "red", icon: <ExclamationCircle /> },
  REACTION: { tone: "red", icon: <PauseSolid /> },
  SOURCE: { tone: "grey", icon: <LinkIcon /> },
};

/** One line of the Hoạt động timeline, coloured by what kind of thing happened. */
export const ActivityRow: FC<{ item: CustomerActivityItem }> = ({ item }) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const formatDate = useMarketingDate();
  const toText = useMarketingEventText();
  const when = formatDate(item.at);

  if (item.kind === "message") {
    const account = item.conversation.account as A;

    return (
      <Row
        tone="blue"
        icon={<ChatBubble />}
        title={
          <Link
            to={`/${workspaceSlug}/${ROUTES.Conversations}/${item.conversation.id}`}
            className="hover:text-ui-fg-interactive transition-colors"
          >
            {t(item.first ? `${KEY}.firstMessage` : `${KEY}.lastMessage`)}
          </Link>
        }
        meta={[when, channelOf(account?.type).label, account?.name]}
      />
    );
  }

  if (item.kind === "order") {
    const { order } = item;

    return (
      <Row
        tone={order.status === "CANCELLED" ? "red" : "green"}
        icon={<ShoppingBag />}
        title={
          <Link
            to={`/${workspaceSlug}/orders/${order.id}`}
            className="hover:text-ui-fg-interactive transition-colors"
          >
            {t(`${KEY}.order`, {
              code: order.code,
              total: formatMoney(order.total, order.currency, i18n.language),
              status: t(`orders.status.${order.status}`),
            })}
          </Link>
        }
        meta={[when, itemsSummary(order)]}
      />
    );
  }

  const { title, reason, actor } = toText(item.event);
  const look = EVENT_LOOK[item.event.kind];

  return (
    <Row
      tone={look.tone}
      icon={look.icon}
      title={title}
      meta={[when, reason, actor]}
    />
  );
};

const Row: FC<{
  tone: Tone;
  icon: ReactNode;
  title: ReactNode;
  meta: (string | null | undefined)[];
}> = ({ tone, icon, title, meta }) => (
  <li className="group flex gap-x-3">
    {/* The rail: each icon joins the next with a line, the last ends it. */}
    <div className="flex flex-none flex-col items-center">
      <ToneIcon tone={tone}>{icon}</ToneIcon>
      <span
        aria-hidden
        className="bg-ui-border-base mt-1 w-px flex-1 group-last:hidden"
      />
    </div>
    <div className="flex min-w-0 flex-col gap-y-0.5 pb-4 pt-0.5 group-last:pb-0">
      <Text size="small" weight="plus">
        {title}
      </Text>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {meta.filter(Boolean).join(" · ")}
      </Text>
    </div>
  </li>
);
