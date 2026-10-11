import { DropdownMenu, Text, clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { NotificationItem } from "@/hooks/api/notifications";
import { formatRelativeTime } from "@/utils/formatters";

import { NotificationIcon } from "./notification-icon";

type NotificationRowProps = {
  notification: NotificationItem;
  // Unread when the menu opened: stays highlighted until it closes, even
  // though it was marked read on open.
  isNew: boolean;
};

export const NotificationRow: FC<NotificationRowProps> = ({
  notification,
  isNew,
}) => {
  const { i18n } = useTranslation();
  const actionUrl = notification.metadata?.actionUrl;

  const content = (
    <div
      className={clx("flex w-full items-start gap-x-3 px-2 py-2", {
        "bg-ui-bg-highlight": isNew,
      })}
    >
      <NotificationIcon notification={notification} />
      <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
        <div className="flex items-start gap-x-2">
          <Text
            size="small"
            weight="plus"
            leading="compact"
            className="flex-1 truncate"
          >
            {notification.title}
          </Text>
          {isNew && (
            <span className="bg-ui-fg-interactive mt-1.5 size-1.5 shrink-0 rounded-full" />
          )}
        </div>
        <Text
          size="xsmall"
          leading="compact"
          className="text-ui-fg-subtle line-clamp-2"
        >
          {notification.message}
        </Text>
        <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
          {formatRelativeTime(notification.createdAt, i18n.language)}
        </Text>
      </div>
    </div>
  );

  if (actionUrl) {
    return (
      <DropdownMenu.Item asChild className="p-0">
        <Link to={actionUrl}>{content}</Link>
      </DropdownMenu.Item>
    );
  }

  return <DropdownMenu.Item className="p-0">{content}</DropdownMenu.Item>;
};
