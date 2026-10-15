import "@/i18n";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { NotificationItem } from "@/hooks/api/notifications";

const toastMock = vi.hoisted(() => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@medusajs/ui", async (original) => ({
  ...(await original<typeof import("@medusajs/ui")>()),
  toast: toastMock,
}));

import { useNewNotificationToast } from "./use-new-notification-toast";

const item = (overrides: Partial<NotificationItem>): NotificationItem => ({
  id: "n-1",
  title: "Title",
  message: "Message",
  type: "info",
  status: "unread",
  createdAt: new Date().toISOString(),
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

const setup = (initial: NotificationItem[] = [item({ id: "old" })]) => {
  const refetch = vi.fn();
  const view = renderHook(
    (props: { notifications: NotificationItem[]; count: number }) =>
      useNewNotificationToast({ ...props, enabled: true, refetch }),
    {
      wrapper,
      initialProps: { notifications: initial, count: initial.length },
    },
  );
  return { ...view, refetch };
};

describe("useNewNotificationToast", () => {
  beforeEach(() => Object.values(toastMock).forEach((fn) => fn.mockReset()));

  it("stays quiet for notifications that were there on load", () => {
    const { result } = setup();

    expect(toastMock.info).not.toHaveBeenCalled();
    expect(result.current.flashKey).toBe(0);
  });

  it("refetches the list when the unread count rises", () => {
    const { rerender, refetch } = setup();
    rerender({ notifications: [item({ id: "old" })], count: 2 });

    expect(refetch).toHaveBeenCalledOnce();
  });

  it("toasts a new notification with its own text and flashes the bell", () => {
    const { rerender, result } = setup();
    act(() =>
      rerender({
        notifications: [
          item({ id: "new", title: "Order paid", message: "Order #12" }),
          item({ id: "old" }),
        ],
        count: 2,
      }),
    );

    expect(toastMock.info).toHaveBeenCalledExactlyOnceWith(
      "Order paid",
      expect.objectContaining({ description: "Order #12", duration: 5000 }),
    );
    expect(result.current.flashKey).toBe(1);
  });

  it("keeps a handoff toast on screen until dismissed", () => {
    const { rerender } = setup();
    rerender({
      notifications: [
        item({
          id: "h",
          type: "warning",
          metadata: { data: { conversationId: "c-1" } },
        }),
        item({ id: "old" }),
      ],
      count: 2,
    });

    expect(toastMock.warning).toHaveBeenCalledExactlyOnceWith(
      "Title",
      expect.objectContaining({ duration: Infinity }),
    );
  });

  it("keeps an error toast on screen until dismissed", () => {
    const { rerender } = setup();
    rerender({
      notifications: [item({ id: "e", type: "error" }), item({ id: "old" })],
      count: 2,
    });

    expect(toastMock.error).toHaveBeenCalledExactlyOnceWith(
      "Title",
      expect.objectContaining({ duration: Infinity }),
    );
  });

  it("groups several new notifications into one toast", () => {
    const { rerender } = setup();
    rerender({
      notifications: [
        item({ id: "a" }),
        item({ id: "b" }),
        item({ id: "old" }),
      ],
      count: 3,
    });

    expect(toastMock.info).toHaveBeenCalledExactlyOnceWith(
      "2 new notifications",
      expect.anything(),
    );
  });

  it("ignores older pages loaded by scrolling", () => {
    const { rerender } = setup();
    const older = Array.from({ length: 5 }, (_, index) =>
      item({ id: `older-${index}` }),
    );
    rerender({
      notifications: [
        item({ id: "old" }),
        ...Array(19)
          .fill(0)
          .map((_, index) => item({ id: `p1-${index}` })),
        ...older,
      ],
      count: 1,
    });
    toastMock.info.mockClear();
    rerender({
      notifications: [
        item({ id: "old" }),
        ...Array(19)
          .fill(0)
          .map((_, index) => item({ id: `p1-${index}` })),
        ...older,
        item({ id: "page3" }),
      ],
      count: 1,
    });

    expect(toastMock.info).not.toHaveBeenCalled();
  });
});
