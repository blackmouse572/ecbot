import { BellAlert } from "@medusajs/icons";
import { DropdownMenu, IconButton, Text } from "@medusajs/ui";
import { Skeleton } from "@repo/ui/common-components";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationsAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/api/notifications";
import { useNotificationSound } from "@/modules/notification";

import { NOTIFICATION_PAGE_SIZE } from "./constants";
import { NotificationEmptyState } from "./notification-empty-state";
import { NotificationRow } from "./notification-row";

export const NotificationMenu: FC = () => {
  const { t } = useTranslation();
  const { count, isFetched } = useUnreadNotificationCount();
  const { notifications, isLoading, refetch } = useNotifications({
    perPage: NOTIFICATION_PAGE_SIZE,
  });
  const markManyAsRead = useMarkNotificationsAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

  useNotificationSound(count, isFetched);

  // Opening the menu counts as seeing what is in it: mark those read so the
  // bell clears, but keep them highlighted until the menu closes.
  const onOpenChange = async (open: boolean) => {
    if (!open) {
      setNewIds(new Set());
      return;
    }
    const { data } = await refetch();
    const unreadIds = (data?.data ?? [])
      .filter((notification) => notification.status === "unread")
      .map((notification) => notification.id);
    if (unreadIds.length === 0) return;
    setNewIds(new Set(unreadIds));
    markManyAsRead.mutate(unreadIds);
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <IconButton
          variant="transparent"
          size="small"
          className="relative"
          aria-label={t("app.menus.notifications.title")}
        >
          <BellAlert className="text-ui-fg-muted" />
          {count > 0 && (
            <span className="bg-ui-tag-red-icon text-ui-fg-on-color absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none tabular-nums">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2">
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
        <DropdownMenu.Separator className="my-0" />
        <div className="max-h-[420px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex flex-col gap-y-3 p-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex items-start gap-x-3">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="flex flex-1 flex-col gap-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                isNew={newIds.has(notification.id)}
              />
            ))
          )}
        </div>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
