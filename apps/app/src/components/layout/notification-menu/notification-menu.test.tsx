import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationItem } from "@/hooks/api/notifications";

const api = vi.hoisted(() => ({
  count: 0,
  notifications: [] as NotificationItem[],
  markMany: vi.fn(),
  markOne: vi.fn(),
  fetchNextPage: vi.fn(),
  hasNextPage: false,
}));

vi.mock("@/hooks/use-leader-tab", () => ({ useIsLeaderTab: () => true }));

vi.mock("@/hooks/api/notifications", () => ({
  useUnreadNotificationCount: () => ({ count: api.count, isFetched: true }),
  useNotifications: () => ({
    notifications: api.notifications,
    isLoading: false,
    isError: false,
    refetch: async () => ({
      data: { pages: [{ data: api.notifications }] },
    }),
    hasNextPage: api.hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage: api.fetchNextPage,
  }),
  useMarkNotificationsAsRead: () => ({ mutate: api.markMany }),
  useMarkNotificationAsRead: () => ({ mutate: api.markOne }),
  useMarkAllNotificationsAsRead: () => ({ mutate: vi.fn() }),
}));

import { NotificationMenu } from "./notification-menu";

// jsdom has no layout: set the scroll box, then fire the scroll event.
const scrollTo = (
  element: HTMLElement,
  box: { scrollTop: number; scrollHeight: number; clientHeight: number },
) => {
  for (const [key, value] of Object.entries(box)) {
    Object.defineProperty(element, key, { configurable: true, value });
  }
  fireEvent.scroll(element);
};

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
    api.markOne.mockReset();
    api.fetchNextPage.mockReset();
    api.hasNextPage = false;
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

  it("keeps a customer-needs-a-person notification unread until clicked", async () => {
    api.count = 2;
    api.notifications = [
      item({ id: "n-1", metadata: { data: { conversationId: "c-1" } } }),
      item({ id: "n-2", title: "Join request" }),
    ];
    open();

    await waitFor(() => expect(api.markMany).toHaveBeenCalledWith(["n-2"]));

    fireEvent.click(screen.getByText("Customer needs a person"));

    expect(api.markOne).toHaveBeenCalledWith("n-1");
  });

  it("marks nothing when the menu closes before the list loads", async () => {
    api.count = 1;
    api.notifications = [item({ id: "n-1" })];
    open();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api.markMany).not.toHaveBeenCalled();
  });

  it("reads the unread count to screen readers", () => {
    api.count = 3;
    render(
      <MemoryRouter>
        <NotificationMenu />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeInTheDocument();
  });

  it("explains the empty state", async () => {
    open();

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    expect(
      screen.getByText(/new updates from your workspaces show up here/i),
    ).toBeInTheDocument();
    expect(api.markMany).not.toHaveBeenCalled();
  });
  it("loads older notifications when scrolled near the bottom", async () => {
    api.hasNextPage = true;
    api.notifications = [item({ id: "n-1", status: "read" })];
    open();

    const list = await screen.findByTestId("notification-list");
    scrollTo(list, { scrollTop: 240, scrollHeight: 600, clientHeight: 320 });

    expect(api.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not load more while far from the bottom", async () => {
    api.hasNextPage = true;
    api.notifications = [item({ id: "n-1", status: "read" })];
    open();

    const list = await screen.findByTestId("notification-list");
    scrollTo(list, { scrollTop: 0, scrollHeight: 1200, clientHeight: 320 });

    expect(api.fetchNextPage).not.toHaveBeenCalled();
  });

  it("shades the edges that have more to scroll", async () => {
    api.notifications = [item({ id: "n-1", status: "read" })];
    open();

    const list = await screen.findByTestId("notification-list");
    scrollTo(list, { scrollTop: 100, scrollHeight: 1200, clientHeight: 320 });

    expect(screen.getByTestId("notification-shadow-top")).toHaveClass(
      "opacity-100",
    );
    expect(screen.getByTestId("notification-shadow-bottom")).toHaveClass(
      "opacity-100",
    );

    scrollTo(list, { scrollTop: 0, scrollHeight: 1200, clientHeight: 320 });
    expect(screen.getByTestId("notification-shadow-top")).toHaveClass(
      "opacity-0",
    );
  });
});
