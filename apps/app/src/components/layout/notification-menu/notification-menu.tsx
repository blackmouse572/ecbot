import { BellAlert } from "@medusajs/icons";
import { DropdownMenu, IconButton, Text, clx } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
  type NotificationItem,
} from "@/hooks/api/notifications";

export const NotificationMenu = () => {
  const { t } = useTranslation();
  const { count } = useUnreadNotificationCount();
  const { notifications } = useNotifications({ perPage: 10 });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton variant="transparent" size="small" className="relative">
          <BellAlert className="text-ui-fg-muted" />
          {count > 0 && (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-red-500" />
          )}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="w-[320px]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <Text size="small" weight="plus">
            {t("app.menus.notifications.title")}
          </Text>
          {count > 0 && (
            <button
              type="button"
              className="text-ui-fg-interactive text-xs hover:underline"
              onClick={() => markAllAsRead.mutate()}
            >
              {t("app.menus.notifications.markAllAsRead")}
            </button>
          )}
        </div>
        <DropdownMenu.Separator />
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <Text size="small" className="text-ui-fg-subtle">
              {t("app.menus.notifications.empty")}
            </Text>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead.mutate(notification.id)}
            />
          ))
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};

const NotificationRow = ({
  notification,
  onRead,
}: {
  notification: NotificationItem;
  onRead: () => void;
}) => {
  const isUnread = notification.status === "unread";
  const content = (
    <div className="flex flex-col gap-y-0.5 overflow-hidden px-2 py-1.5">
      <div className="flex items-center gap-x-1.5">
        {isUnread && (
          <span className="size-1.5 shrink-0 rounded-full bg-red-500" />
        )}
        <Text size="small" weight="plus" className="truncate" leading="compact">
          {notification.title}
        </Text>
      </div>
      <Text
        size="xsmall"
        leading="compact"
        className={clx("text-ui-fg-subtle line-clamp-2", {
          "pl-3": isUnread,
        })}
      >
        {notification.message}
      </Text>
    </div>
  );

  if (notification.metadata?.actionUrl) {
    return (
      <DropdownMenu.Item asChild onClick={isUnread ? onRead : undefined}>
        <Link to={notification.metadata.actionUrl}>{content}</Link>
      </DropdownMenu.Item>
    );
  }

  return (
    <DropdownMenu.Item onClick={isUnread ? onRead : undefined}>
      {content}
    </DropdownMenu.Item>
  );
};
