import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/client", () => ({
  notificationSharedControllerListV1: vi.fn(async () => ({
    data: {
      data: [
        {
          id: "notif-1",
          title: "Account Connection Blocked",
          message: 'Your connected account "My Zalo" has been disconnected.',
          type: "warning",
          status: "unread",
          metadata: { actionUrl: "/w/accounts/acc-1", actionText: "Reconnect" },
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  })),
  notificationSharedControllerListUnreadV1: vi.fn(),
  notificationSharedControllerMarkAsReadV1: vi.fn(),
  notificationSharedControllerMarkAllAsReadV1: vi.fn(),
  notificationSharedControllerUnreadV1: vi.fn(async () => ({
    data: { data: { count: 3 } },
  })),
}));

import {
  notificationSharedControllerMarkAsReadV1,
  notificationSharedControllerUnreadV1,
} from "@repo/client";

import {
  notificationQueryKey,
  useMarkNotificationsAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "./notifications";

const wrapper = ({ children }: PropsWithChildren) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
};

describe("useNotifications", () => {
  it("returns the notification list", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.notifications.length).toBe(1));

    expect(result.current.notifications[0].title).toBe(
      "Account Connection Blocked",
    );
  });
});

describe("useUnreadNotificationCount", () => {
  it("returns the unread count", async () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.count).toBe(3));
  });

  it("refetches once when the tab regains focus, with the app's defaults", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: 0, refetchOnWindowFocus: false },
      },
    });
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(QueryClientProvider, { client }, children),
    });
    await waitFor(() => expect(result.current.count).toBe(3));
    vi.mocked(notificationSharedControllerUnreadV1).mockClear();

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await waitFor(() =>
      expect(notificationSharedControllerUnreadV1).toHaveBeenCalledTimes(1),
    );
  });
});

describe("useMarkNotificationsAsRead", () => {
  it("keeps going past a failed request and lowers the count per success", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const countKey = notificationQueryKey.list({ scope: "unread-count" });
    client.setQueryData(countKey, { data: { count: 3 } });
    vi.mocked(notificationSharedControllerMarkAsReadV1)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValueOnce({} as never);
    const counts: number[] = [];
    client.getQueryCache().subscribe(() => {
      const count = (
        client.getQueryData(countKey) as { data: { count: number } }
      )?.data.count;
      if (counts.at(-1) !== count) counts.push(count);
    });

    const { result } = renderHook(() => useMarkNotificationsAsRead(), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(QueryClientProvider, { client }, children),
    });
    await result.current.mutateAsync(["a", "b", "c"]);

    expect(notificationSharedControllerMarkAsReadV1).toHaveBeenCalledTimes(3);
    expect(counts.slice(0, 2)).toEqual([2, 1]);
  });
});
