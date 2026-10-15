import { toast } from "@medusajs/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { NotificationItem } from "@/hooks/api/notifications";

import { NOTIFICATION_PAGE_SIZE } from "./constants";
import { isHandoffNotification } from "./is-handoff-notification";

const TOAST_DURATION = 5000;

type Options = {
  notifications: NotificationItem[];
  count: number;
  // False until the first list has loaded, and in tabs that stay quiet.
  enabled: boolean;
  refetch: () => unknown;
};

/**
 * Shows a toast (top right, next to the bell) for notifications that arrive
 * while the app is open, and returns a key that changes each time so the bell
 * can flash. A customer waiting for a person and failures stay until closed.
 */
export const useNewNotificationToast = ({
  notifications,
  count,
  enabled,
  refetch,
}: Options) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [flashKey, setFlashKey] = useState(0);
  const knownIds = useRef<Set<string> | null>(null);
  const previousCount = useRef<number | undefined>(undefined);

  // The list only refetches on its own when the menu opens: pull it when the
  // count says something new arrived.
  useEffect(() => {
    if (!enabled) return;
    if (previousCount.current !== undefined && count > previousCount.current) {
      void refetch();
    }
    previousCount.current = count;
  }, [count, enabled, refetch]);

  useEffect(() => {
    if (!enabled) return;
    // Only the newest page counts: older pages load while scrolling.
    const newest = notifications.slice(0, NOTIFICATION_PAGE_SIZE);
    const known = knownIds.current;
    knownIds.current = new Set(newest.map((notification) => notification.id));
    if (!known) return;

    const fresh = newest.filter(
      (notification) =>
        notification.status === "unread" && !known.has(notification.id),
    );
    if (fresh.length === 0) return;

    const [first] = fresh;
    const urgent = fresh.some(
      (notification) =>
        isHandoffNotification(notification) || notification.type === "error",
    );
    const variant = fresh.some(isHandoffNotification)
      ? "warning"
      : fresh.some((notification) => notification.type === "error")
        ? "error"
        : "info";
    const actionUrl =
      fresh.length === 1 ? first.metadata?.actionUrl : undefined;

    toast[variant](
      fresh.length === 1
        ? first.title
        : t("app.menus.notifications.newMany", { count: fresh.length }),
      {
        position: "top-right",
        description: fresh.length === 1 ? first.message : undefined,
        duration: urgent ? Infinity : TOAST_DURATION,
        dismissable: true,
        action: actionUrl
          ? {
              label: t("app.menus.notifications.view"),
              onClick: () => navigate(actionUrl),
              altText: t("app.menus.notifications.view"),
              variant: "secondary",
            }
          : undefined,
      },
    );
    setFlashKey((key) => key + 1);
  }, [notifications, enabled, navigate, t]);

  return { flashKey };
};
