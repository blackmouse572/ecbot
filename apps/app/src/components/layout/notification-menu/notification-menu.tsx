import { BellAlert } from "@medusajs/icons";
import { DropdownMenu, IconButton, Text, clx } from "@medusajs/ui";
import { useRef, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useMarkNotificationsAsRead,
  useNotifications,
  useUnreadNotificationCount,
  type NotificationItem,
} from "@/hooks/api/notifications";
import { useIsLeaderTab } from "@/hooks/use-leader-tab";
import { usePushBridge } from "@/modules/pwa";
import { useNotificationSound } from "@/modules/sound";

import { NOTIFICATION_PAGE_SIZE } from "./constants";
import { isHandoffNotification } from "./is-handoff-notification";
import { NotificationBellFlash } from "./notification-bell-flash";
import { NotificationEmptyState } from "./notification-empty-state";
import { NotificationRow } from "./notification-row";
import { NotificationRowSkeleton } from "./notification-row-skeleton";
import { useNewNotificationToast } from "./use-new-notification-toast";
import { useScrollEdges } from "@/hooks/use-scroll-edges";
import { ScrollEdgeBlur } from "../main-layout/scroll-edge-blur";

export const NotificationMenu: FC = () => {
  const { t } = useTranslation();
  // One tab plays the sound, so several open tabs don't ring several times
  // for one notification.
  const isLeader = useIsLeaderTab("eccho:notifications");
  const { count, isFetched } = useUnreadNotificationCount();
  const {
    notifications,
    isLoading,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications({ perPage: NOTIFICATION_PAGE_SIZE });
  const markManyAsRead = useMarkNotificationsAsRead();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const isOpen = useRef(false);

  usePushBridge();
  useNotificationSound(isFetched && isLeader ? count : undefined);
  const { flashKey } = useNewNotificationToast({
    notifications,
    count,
    enabled: isFetched && isLeader && !isLoading,
    refetch,
  });

  // Seeing a row counts as reading it: mark it read so the bell clears, but
  // keep it highlighted until the menu closes. A customer waiting for a
  // person stays unread until its row is clicked.
  const markSeen = (rows: NotificationItem[]) => {
    if (!isOpen.current) return;
    const seenIds = rows.flatMap((notification) =>
      notification.status === "unread" && !isHandoffNotification(notification)
        ? [notification.id]
        : [],
    );
    if (seenIds.length === 0) return;
    setNewIds((previous) => new Set([...previous, ...seenIds]));
    markManyAsRead.mutate(seenIds);
  };

  // Older pages load as the reader scrolls; their rows are seen too.
  const loadMore = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage().then(({ data }) =>
      markSeen(data?.pages.at(-1)?.data ?? []),
    );
  };
  const edges = useScrollEdges(notifications.length, loadMore);

  const onOpenChange = async (open: boolean) => {
    isOpen.current = open;
    if (!open) {
      setNewIds(new Set());
      return;
    }
    const { data } = await refetch();
    markSeen(data?.pages.flatMap((page) => page?.data ?? []) ?? []);
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <IconButton
          variant="transparent"
          size="small"
          className="relative"
          aria-label={
            count > 0
              ? t("app.menus.notifications.unreadLabel", { count })
              : t("app.menus.notifications.title")
          }
        >
          <BellAlert className="text-ui-fg-muted" />
          <NotificationBellFlash flashKey={flashKey} />
          {count > 0 && (
            <span className="bg-ui-tag-red-icon text-ui-fg-on-color absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none tabular-nums">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </IconButton>
      </DropdownMenu.Trigger>
      {/* overflow-visible: Chromium drops the edge blur's mask under a rounded
          clipping ancestor, so the list rounds itself instead. */}
      <DropdownMenu.Content className="w-[360px] overflow-visible p-0">
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
        <DropdownMenu.Separator className="mx-0 my-0" />
        <div className="relative">
          <div
            ref={edges.ref}
            data-testid="notification-list"
            className="max-h-[420px] overflow-y-auto rounded-b-lg p-1"
            onScroll={edges.onScroll}
          >
            {isLoading ? (
              [0, 1, 2].map((index) => <NotificationRowSkeleton key={index} />)
            ) : notifications.length === 0 ? (
              <NotificationEmptyState />
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  isNew={
                    newIds.has(notification.id) ||
                    notification.status === "unread"
                  }
                  onClick={
                    notification.status === "unread"
                      ? () => markAsRead.mutate(notification.id)
                      : undefined
                  }
                />
              ))
            )}
            {isFetchingNextPage && <NotificationRowSkeleton />}
          </div>
          <ScrollEdgeBlur
            side="top"
            visible={edges.top}
            fadeFrom="from-ui-bg-component"
            className="top-0 h-12"
            testId="notification-shadow-top"
          />
          <ScrollEdgeBlur
            side="bottom"
            visible={edges.bottom}
            fadeFrom="from-ui-bg-component"
            className="bottom-0 h-12"
            testId="notification-shadow-bottom"
          />
        </div>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
