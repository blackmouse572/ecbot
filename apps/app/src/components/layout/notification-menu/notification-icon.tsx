import { clx } from "@medusajs/ui";
import type { FC } from "react";

import type { NotificationItem } from "@/hooks/api/notifications";

import { NOTIFICATION_ICONS } from "./constants";
import { isHandoffNotification } from "./is-handoff-notification";

type NotificationIconProps = { notification: NotificationItem };

export const NotificationIcon: FC<NotificationIconProps> = ({
  notification,
}) => {
  const key = isHandoffNotification(notification)
    ? "handoff"
    : notification.type;
  const { Icon, className } =
    NOTIFICATION_ICONS[key] ?? NOTIFICATION_ICONS.info;

  return (
    <div
      aria-hidden
      className={clx(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        className,
      )}
    >
      <Icon className="size-4" />
    </div>
  );
};
