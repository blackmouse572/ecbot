import { queryKeysFactory } from "@/libs/query-factory";
import {
  notificationSharedControllerListUnreadV1,
  notificationSharedControllerListV1,
  notificationSharedControllerMarkAllAsReadV1,
  notificationSharedControllerMarkAsReadV1,
  notificationSharedControllerPushPublicKeyV1,
  notificationSharedControllerPushSubscribeV1,
  notificationSharedControllerPushUnsubscribeV1,
  notificationSharedControllerUnreadV1,
  type NotificationPushSubscribeRequestDto,
} from "@repo/client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type MutationOptions,
} from "@tanstack/react-query";
import { useMemo } from "react";

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

type NotificationPage = {
  data: NotificationItem[];
  _metadata?: { pagination?: { page?: number; totalPage?: number } };
};

/** Newest first, one page at a time (`fetchNextPage` loads older ones). */
export function useNotifications(query?: Record<string, A>) {
  const { data, ...rest } = useInfiniteQuery({
    queryKey: notificationQueryKey.list(query),
    queryFn: async ({ pageParam }) => {
      const response = await notificationSharedControllerListV1({
        query: { ...query, page: pageParam },
      });
      return response?.data as unknown as NotificationPage;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, totalPage } = last?._metadata?.pagination ?? {};
      return page && totalPage && page < totalPage ? page + 1 : undefined;
    },
  });

  const notifications = useMemo(
    () => data?.pages.flatMap((page) => page?.data ?? []) ?? [],
    [data?.pages],
  );

  return { notifications, data, ...rest };
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

/** Polls only while the tab is visible; regaining focus refetches once. */
export function useUnreadNotificationCount() {
  const { data, ...rest } = useQuery({
    queryKey: notificationQueryKey.list({ scope: "unread-count" }),
    queryFn: async () => {
      const response = await notificationSharedControllerUnreadV1();
      return response?.data as unknown as { data: { count: number } };
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
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

/**
 * Marks several notifications read (the menu does this on open). One request
 * at a time: the API throttles bursts to 10 requests per half second. A
 * failed one is skipped (it stays unread for next time) and the bell drops
 * by one per success, without waiting for the whole batch.
 */
export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        try {
          await notificationSharedControllerMarkAsReadV1({
            path: { notification: id },
          });
        } catch {
          continue;
        }
        queryClient.setQueryData<{ data: { count: number } }>(
          notificationQueryKey.list({ scope: "unread-count" }),
          (old) =>
            old && { ...old, data: { count: Math.max(0, old.data.count - 1) } },
        );
      }
    },
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

/** The server's Web Push key; null when push is not set up on the server. */
export function usePushPublicKey() {
  const { data, ...rest } = useQuery({
    queryKey: notificationQueryKey.detail("push-public-key"),
    queryFn: async () => {
      const response = await notificationSharedControllerPushPublicKeyV1();
      return response?.data as unknown as {
        data: { publicKey: string | null };
      };
    },
    staleTime: Infinity,
  });

  return { publicKey: data?.data?.publicKey ?? null, ...rest };
}

/** Tells the server to send this user's notifications to this browser. */
export function savePushSubscription(subscription: PushSubscription) {
  // toJSON() also has expirationTime, which the API rejects as unknown.
  const { endpoint, keys } = subscription.toJSON();
  return notificationSharedControllerPushSubscribeV1({
    body: { endpoint, keys } as NotificationPushSubscribeRequestDto,
  });
}

/** Tells the server to stop sending to this browser. */
export function removePushSubscription(endpoint: string) {
  return notificationSharedControllerPushUnsubscribeV1({ body: { endpoint } });
}
