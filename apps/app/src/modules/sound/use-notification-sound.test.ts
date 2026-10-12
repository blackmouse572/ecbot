import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const play = vi.hoisted(() => vi.fn());
vi.mock("./use-ui-sound", () => ({ useUISound: () => play }));

import { useNotificationSound } from "./use-notification-sound";

const setup = () =>
  renderHook(({ count }) => useNotificationSound(count), {
    initialProps: { count: undefined as number | undefined },
  });

describe("useNotificationSound", () => {
  beforeEach(() => play.mockReset());

  it("stays quiet for the count that was already there on load", () => {
    const { rerender } = setup();
    rerender({ count: 4 });

    expect(play).not.toHaveBeenCalled();
  });

  it("plays when the unread count goes up", () => {
    const { rerender } = setup();
    rerender({ count: 2 });
    rerender({ count: 3 });

    expect(play).toHaveBeenCalledExactlyOnceWith("notification");
  });

  it("stays quiet when the count goes down", () => {
    const { rerender } = setup();
    rerender({ count: 2 });
    rerender({ count: 0 });

    expect(play).not.toHaveBeenCalled();
  });
});
