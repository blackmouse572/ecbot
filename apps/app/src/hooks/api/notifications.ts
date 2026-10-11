import { queryKeysFactory } from "@/libs/query-factory";
import {
  notificationSharedControllerListUnreadV1,
  notificationSharedControllerListV1,
  notificationSharedControllerMarkAllAsReadV1,
  notificationSharedControllerMarkAsReadV1,
  notificationSharedControllerUnreadV1,
} from "@repo/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type MutationOptions,
} from "@tanstack/react-query";

export const notificationQueryKey = queryKeysFactory("notifications");

// @repo/client's generated NotificationListDto is the *query filter* shape,
// not the response item shape — the actual API returns full NotificationEntity
// fields. Cast through this local type, same workaround as invitations.ts.
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  status: "read" | "archived" | "unread" | "dismissed";
  priority?: "low" | "medium" | "high" | "urgent";
  metadata?: {
    actionUrl?: string;
    actionText?: string;
    // Per-kind payload (conversationId for a handoff, ...).
    data?: Record<string, A>;
  };
  createdAt: string;
}

export function useNotifications(query?: Record<string, A>) {
  const { data, ...rest } = useQuery({
    queryKey: notificationQueryKey.list(query),
    queryFn: async () => {
      const response = await notificationSharedControllerListV1({ query });
      return response?.data as unknown as { data: NotificationItem[] };
    },
  });

  return { notifications: data?.data ?? [], data, ...rest };
}

export function useUnreadNotifications(query?: Record<string, A>) {
  const { data, ...rest } = useQuery({
    queryKey: notificationQueryKey.list({ ...query, unread: true }),
    queryFn: async () => {
      const response = await notificationSharedControllerListUnreadV1({
        query,
      });
      return response?.data as unknown as { data: NotificationItem[] };
    },
  });

  return { notifications: data?.data ?? [], data, ...rest };
}

export function useUnreadNotificationCount() {
  const { data, ...rest } = useQuery({
    queryKey: notificationQueryKey.list({ scope: "unread-count" }),
    queryFn: async () => {
      const response = await notificationSharedControllerUnreadV1();
      return response?.data as unknown as { data: { count: number } };
    },
    // Keep polling in a background tab so the new-notification chime still
    // plays while the user works elsewhere.
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  return { count: data?.data?.count ?? 0, ...rest };
}

export function useMarkNotificationAsRead(
  options?: MutationOptions<A, A, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      notificationSharedControllerMarkAsReadV1({
        path: { notification: id },
      }),
    onSuccess: (d, v, c) => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKey.all,
        exact: false,
      });
      options?.onSuccess?.(d, v, c);
    },
    ...options,
  });
}

/** Marks several notifications read at once (the menu does this on open). */
export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(
        ids.map((id) =>
          notificationSharedControllerMarkAsReadV1({
            path: { notification: id },
          }),
        ),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: notificationQueryKey.all,
        exact: false,
      }),
  });
}

export function useMarkAllNotificationsAsRead(
  options?: MutationOptions<A, A, void>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationSharedControllerMarkAllAsReadV1(),
    onSuccess: (d, v, c) => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKey.all,
        exact: false,
      });
      options?.onSuccess?.(d, v, c);
    },
    ...options,
  });
}
