import type { ContactPointGetResponseDto } from "@/hooks/api/contact-points";
import { useFreeWindowLeft } from "@/components/customer-marketing";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { useConversations } from "@/hooks/api/conversations";
import { useCustomerMarketing } from "@/hooks/api/customer-marketing";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
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

/**
 * One row per channel the customer wrote on: who they are there, how long
 * the shop may still message them for free, and a link to that conversation.
 */
export const ContactPointsList: FC<Props> = ({ customerId, contactPoints }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  // Same query as the conversations section, so it comes from the cache.
  const { conversations } = useConversations({
    customer: customerId,
    perPage: 100,
    orderBy: "lastMessageAt",
    orderDirection: "DESC",
  });
  const { marketing } = useCustomerMarketing(customerId);
  const windowLeft = useFreeWindowLeft();
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
    const time = windowLeft(openUntil, now);

    if (time === undefined)
      return { text: t(`${KEY}.windowUnlimited`), open: true };
    if (time === null) return { text: t(`${KEY}.windowClosed`), open: false };

    return { text: t(`${KEY}.windowOpen`, { time }), open: true };
  };

  // "14:30" for today, "05/11" before that.
  const inboundAt = (value: string) => {
    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");

    return date.toDateString() === new Date(now).toDateString()
      ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
      : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  };

  return (
    <div className="@container flex flex-col gap-y-2">
      <ul className="shadow-borders-base divide-ui-border-base flex flex-col divide-y overflow-hidden rounded-md">
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
              <div className="relative row-span-2 @[20rem]:row-span-1">
                <Avatar
                  size="small"
                  src={cp.senderAvatar ?? undefined}
                  fallback={name.slice(0, 1).toUpperCase()}
                />
                <PlatformIcon
                  type={cp.platform as A}
                  size={14}
                  className="ring-ui-bg-base absolute -bottom-0.5 -right-0.5 rounded-full ring-2"
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <Text size="small" weight="plus" className="truncate">
                  {name}
                </Text>
                <Text size="xsmall" className="text-ui-fg-subtle truncate">
                  {channel}
                </Text>
              </div>
              {window && status && (
                // Under the channel in the narrow panel, on the right in the page.
                <div className="col-start-2 flex flex-wrap items-center gap-x-2 @[20rem]:col-start-3 @[20rem]:row-start-1 @[20rem]:flex-col @[20rem]:items-end @[20rem]:gap-y-0.5">
                  <Text
                    size="xsmall"
                    weight="plus"
                    className={clx(
                      "inline-flex items-center gap-x-1.5",
                      status.open
                        ? "text-ui-tag-green-text"
                        : "text-ui-fg-muted",
                    )}
                  >
                    <span
                      aria-hidden
                      className={clx(
                        "size-1.5 rounded-full",
                        status.open
                          ? "bg-ui-tag-green-icon"
                          : "bg-ui-border-strong",
                      )}
                    />
                    {status.text}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {t(`${KEY}.lastInbound`, {
                      time: inboundAt(window.lastInboundAt),
                    })}
                  </Text>
                </div>
              )}
              {conversation && (
                <ChevronRight className="text-ui-fg-muted col-start-4 row-span-2 row-start-1 @[20rem]:row-span-1" />
              )}
            </>
          );
          const rowClass =
            "grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2.5 px-3 py-2.5";

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
    </div>
  );
};
