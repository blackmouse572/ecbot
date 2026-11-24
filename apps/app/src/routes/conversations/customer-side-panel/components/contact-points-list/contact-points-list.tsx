import type { ContactPointGetResponseDto } from "@/hooks/api/contact-points";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { useConversations } from "@/hooks/api/conversations";
import { useCustomerMarketing } from "@/hooks/api/customer-marketing";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { formatRelativeTime } from "@/utils/formatters";
import { ChevronRight } from "@medusajs/icons";
import { Avatar, Text, clx } from "@medusajs/ui";
import { NoRecords } from "@repo/ui/common-components";
import { IconAddressBook } from "@tabler/icons-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type Props = {
  customerId: string;
  contactPoints: ContactPointGetResponseDto[];
};

const KEY = "conversations.customer.panel.contactPoints";
const WINDOW_KEY = "conversations.customer.panel.marketing.freeWindow";
const HOUR = 3_600_000;
const MINUTE = 60_000;

/**
 * One row per channel the customer wrote on: who they are there, how long
 * the shop may still message them for free, and a link to that conversation.
 */
export const ContactPointsList: FC<Props> = ({ customerId, contactPoints }) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  // Same query as the conversations section, so it comes from the cache.
  const { conversations } = useConversations({
    customer: customerId,
    perPage: 100,
    orderBy: "lastMessageAt",
    orderDirection: "DESC",
  });
  const { marketing } = useCustomerMarketing(customerId);
  const now = Date.now();

  if (contactPoints.length === 0) {
    return (
      <NoRecords
        size="small"
        title={t(`${KEY}.empty`)}
        message={t(`${KEY}.emptyHint`)}
        icon={<IconAddressBook />}
      />
    );
  }

  const windowStatus = (openUntil: string | null | undefined) => {
    if (!openUntil) return { text: t(`${KEY}.windowUnlimited`), open: true };
    const left = new Date(openUntil).getTime() - now;

    if (left <= 0) return { text: t(`${KEY}.windowClosed`), open: false };
    const time =
      left >= HOUR
        ? t(`${WINDOW_KEY}.hours`, { count: Math.floor(left / HOUR) })
        : t(`${WINDOW_KEY}.minutes`, {
            count: Math.max(1, Math.floor(left / MINUTE)),
          });

    return { text: t(`${KEY}.windowOpen`, { time }), open: true };
  };

  return (
    <ul className="flex flex-col">
      {contactPoints.map((cp) => {
        const conversation = conversations.find(
          (c) => c.senderId === cp.externalSenderId,
        );
        const window = marketing?.freeWindows.find(
          (w) => w.channel === cp.platform,
        );
        const status = window && windowStatus(window.openUntil);
        const name = cp.displaySenderName ?? cp.externalSenderId;
        const accountName = (conversation?.account as A)?.name as
          string | undefined;
        const channel = [channelOf(cp.platform as A).label, accountName]
          .filter(Boolean)
          .join(" · ");

        const content = (
          <>
            <div className="relative shrink-0">
              <Avatar
                variant="rounded"
                size="small"
                src={cp.senderAvatar ?? undefined}
                fallback={name.slice(0, 1).toUpperCase()}
              />
              <PlatformIcon
                type={cp.platform as A}
                size={14}
                className="ring-ui-bg-base absolute -bottom-0.5 -right-0.5 ring-2"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Text size="small" weight="plus" className="truncate">
                {name}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle truncate">
                {channel}
              </Text>
            </div>
            {window && status && (
              <div className="flex shrink-0 flex-col items-end">
                <Text
                  size="xsmall"
                  weight="plus"
                  className={
                    status.open ? "text-ui-tag-green-text" : "text-ui-fg-muted"
                  }
                >
                  {status.text}
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {t(`${KEY}.lastInbound`, {
                    time: formatRelativeTime(
                      window.lastInboundAt,
                      i18n.language,
                      now,
                    ),
                  })}
                </Text>
              </div>
            )}
            {conversation && (
              <ChevronRight className="text-ui-fg-muted shrink-0" />
            )}
          </>
        );
        const rowClass = "flex items-center gap-x-3 rounded-md px-2 py-2";

        return (
          <li key={cp.id}>
            {conversation ? (
              <Link
                to={`/${workspaceSlug}/${ROUTES.Conversations}/${conversation.id}`}
                className={clx(
                  rowClass,
                  "hover:bg-ui-bg-base-hover transition-colors",
                )}
              >
                {content}
              </Link>
            ) : (
              <div className={rowClass}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
