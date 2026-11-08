import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationItem } from "@/hooks/api/notifications";

const api = vi.hoisted(() => ({
  count: 0,
  notifications: [] as NotificationItem[],
  markMany: vi.fn(),
  markOne: vi.fn(),
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  invitations: [] as unknown[],
  invitationsFetched: true,
  accepted: [] as string[],
  declined: [] as string[],
}));

vi.mock("@/hooks/api/workspace-member", () => ({
  useMyInvitations: () => ({
    invitations: api.invitationsFetched ? api.invitations : [],
    isFetched: api.invitationsFetched,
  }),
  useAcceptMyInvitation: () => ({
    isPending: false,
    mutateAsync: async (id: string) => {
      api.accepted.push(id);
      return {
        workspace: { id: "ws-c", name: "Tiệm Bánh", slug: "c" },
        roleName: "Member",
      };
    },
  }),
  useDeclineMyInvitation: () => ({
    isPending: false,
    mutateAsync: async (id: string) => {
      api.declined.push(id);
    },
  }),
}));

vi.mock("@/hooks/use-leader-tab", () => ({ useIsLeaderTab: () => true }));
vi.mock("@/modules/pwa", () => ({ usePushBridge: () => undefined }));

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

const Location = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const open = () => {
  render(
    <MemoryRouter>
      <NotificationMenu />
      <Routes>
        <Route path="*" element={<Location />} />
      </Routes>
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
    api.fetchNextPage.mockReset().mockResolvedValue({ data: undefined });
    api.hasNextPage = false;
    api.count = 0;
    api.notifications = [];
    api.invitations = [];
    api.invitationsFetched = true;
    api.accepted = [];
    api.declined = [];
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

  it("marks unread rows from older pages read as they load", async () => {
    api.hasNextPage = true;
    api.notifications = [item({ id: "n-1", status: "read" })];
    api.fetchNextPage.mockResolvedValue({
      data: {
        pages: [
          { data: api.notifications },
          {
            data: [item({ id: "n-21" }), item({ id: "n-22", status: "read" })],
          },
        ],
      },
    });
    open();

    const list = await screen.findByTestId("notification-list");
    scrollTo(list, { scrollTop: 240, scrollHeight: 600, clientHeight: 320 });

    await waitFor(() => expect(api.markMany).toHaveBeenCalledWith(["n-21"]));
  });

  it("does not load more while far from the bottom", async () => {
    api.hasNextPage = true;
    api.notifications = [item({ id: "n-1", status: "read" })];
    open();

    const list = await screen.findByTestId("notification-list");
    scrollTo(list, { scrollTop: 0, scrollHeight: 1200, clientHeight: 320 });

    expect(api.fetchNextPage).not.toHaveBeenCalled();
  });

  it("shades the bottom edge as soon as an overflowing list opens", async () => {
    api.notifications = [item({ id: "n-1", status: "read" })];
    const sizes = vi
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(1200);
    const height = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(320);
    open();

    expect(await screen.findByTestId("notification-shadow-bottom")).toHaveClass(
      "opacity-100",
    );
    sizes.mockRestore();
    height.mockRestore();
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

  describe("invitations", () => {
    const invitation = {
      id: "inv-1",
      workspace: { id: "ws-c", name: "Tiệm Bánh", slug: "c" },
      inviterName: "Lan",
      roleName: "Member",
      expiresAt: "2026-11-15T00:00:00.000Z",
    };
    const invited = (data: Record<string, unknown>) =>
      item({
        id: "n-inv",
        type: "invitation",
        title: "Workspace invitation",
        message: "Lan invited you to Tiệm Bánh.",
        metadata: { actionUrl: "/invitation?token=t", data },
      });

    it("puts Decline and Accept on a pending invitation and keeps it unread", async () => {
      api.count = 2;
      api.invitations = [invitation];
      api.notifications = [
        invited({ invitationId: "inv-1", workspace: { id: "ws-c" } }),
        item({ id: "n-2" }),
      ];
      open();

      await waitFor(() => expect(api.markMany).toHaveBeenCalledWith(["n-2"]));
      expect(screen.getByRole("menuitem", { name: "Decline" })).toBeTruthy();
      expect(screen.getByRole("menuitem", { name: "Accept" })).toBeTruthy();
    });

    it("keeps invitation rows unread while my invitations are still loading", async () => {
      api.invitationsFetched = false;
      api.invitations = [invitation];
      api.notifications = [
        invited({ invitationId: "inv-1" }),
        item({ id: "n-2" }),
      ];
      open();

      await waitFor(() => expect(api.markMany).toHaveBeenCalledWith(["n-2"]));
    });

    it("keeps the row a link to its invitation page beside the buttons", async () => {
      api.invitations = [invitation];
      api.notifications = [invited({ invitationId: "inv-1" })];
      open();

      const row = await screen.findByRole("menuitem", {
        name: /Workspace invitation/,
      });
      expect(row.getAttribute("href")).toBe("/invitation?token=t");
      expect(
        row.contains(screen.getByRole("menuitem", { name: "Accept" })),
      ).toBe(false);
    });

    it("Accept joins and opens that workspace's dashboard", async () => {
      api.invitations = [invitation];
      api.notifications = [invited({ invitationId: "inv-1" })];
      open();

      fireEvent.click(await screen.findByRole("menuitem", { name: "Accept" }));

      await waitFor(() =>
        expect(screen.getByTestId("location").textContent).toBe("/c/dashboard"),
      );
      expect(api.accepted).toEqual(["inv-1"]);
    });

    it("Decline declines it", async () => {
      api.invitations = [invitation];
      api.notifications = [invited({ invitationId: "inv-1" })];
      open();

      fireEvent.click(await screen.findByRole("menuitem", { name: "Decline" }));

      await waitFor(() => expect(api.declined).toEqual(["inv-1"]));
    });

    it("matches an older notification by its workspace", async () => {
      api.invitations = [invitation];
      api.notifications = [invited({ workspace: { id: "ws-c" } })];
      open();

      expect(
        await screen.findByRole("menuitem", { name: "Accept" }),
      ).toBeTruthy();
    });

    it("has no buttons once the invitation is answered", async () => {
      api.notifications = [invited({ invitationId: "inv-1" })];
      open();

      expect(await screen.findByText("Workspace invitation")).toBeTruthy();
      expect(screen.queryByRole("menuitem", { name: "Accept" })).toBeNull();
    });
  });
});
