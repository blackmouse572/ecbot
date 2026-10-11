import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationItem } from "@/hooks/api/notifications";

const api = vi.hoisted(() => ({
  count: 0,
  notifications: [] as NotificationItem[],
  markMany: vi.fn(),
}));

vi.mock("@/hooks/api/notifications", () => ({
  useUnreadNotificationCount: () => ({ count: api.count, isFetched: true }),
  useNotifications: () => ({
    notifications: api.notifications,
    isLoading: false,
    isError: false,
    refetch: async () => ({ data: { data: api.notifications } }),
  }),
  useMarkNotificationsAsRead: () => ({ mutate: api.markMany }),
  useMarkAllNotificationsAsRead: () => ({ mutate: vi.fn() }),
}));

import { NotificationMenu } from "./notification-menu";

const item = (overrides: Partial<NotificationItem>): NotificationItem => ({
  id: "n-1",
  title: "Customer needs a person",
  message: "The agent could not answer.",
  type: "warning",
  status: "unread",
  createdAt: new Date().toISOString(),
  ...overrides,
});

const open = () => {
  render(
    <MemoryRouter>
      <NotificationMenu />
    </MemoryRouter>,
  );
  fireEvent.keyDown(screen.getByRole("button", { name: /notifications/i }), {
    key: "Enter",
  });
};

describe("NotificationMenu", () => {
  beforeEach(() => {
    api.markMany.mockReset();
    api.count = 0;
    api.notifications = [];
  });

  it("shows the unread count on the bell", () => {
    api.count = 12;
    render(
      <MemoryRouter>
        <NotificationMenu />
      </MemoryRouter>,
    );

    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("marks the unread notifications read when opened", async () => {
    api.count = 1;
    api.notifications = [
      item({ id: "n-1" }),
      item({ id: "n-2", status: "read", title: "Old one" }),
    ];
    open();

    await waitFor(() => expect(api.markMany).toHaveBeenCalledWith(["n-1"]));
    expect(screen.getByText("Customer needs a person")).toBeInTheDocument();
    expect(screen.getAllByText("now")).toHaveLength(2);
  });

  it("explains the empty state", async () => {
    open();

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    expect(
      screen.getByText(/new updates from your workspaces show up here/i),
    ).toBeInTheDocument();
    expect(api.markMany).not.toHaveBeenCalled();
  });
});
