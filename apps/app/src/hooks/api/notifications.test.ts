import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

import { useNotifications, useUnreadNotificationCount } from "./notifications";

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
});
