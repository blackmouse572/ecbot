import type { NotificationItem } from "@/hooks/api/notifications";

/** "A customer needs a person": its type is `warning`, so tell it by payload. */
export const isHandoffNotification = (notification: NotificationItem) =>
  Boolean(notification.metadata?.data?.conversationId);
