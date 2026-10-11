import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { createElement, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const playChime = vi.hoisted(() => vi.fn());
vi.mock("./play-notification-chime", () => ({
  playNotificationChime: playChime,
}));

import { notificationSoundAtom } from "./state";
import { useNotificationSound } from "./use-notification-sound";

const setup = (soundOn: boolean) => {
  const store = createStore();
  store.set(notificationSoundAtom, soundOn);
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(Provider, { store }, children);
  return renderHook(
    ({ count, isFetched }) => useNotificationSound(count, isFetched),
    { wrapper, initialProps: { count: 0, isFetched: false } },
  );
};

describe("useNotificationSound", () => {
  beforeEach(() => playChime.mockReset());

  it("stays quiet for the count that was already there on load", () => {
    const { rerender } = setup(true);
    rerender({ count: 4, isFetched: true });

    expect(playChime).not.toHaveBeenCalled();
  });

  it("plays when the unread count goes up", () => {
    const { rerender } = setup(true);
    rerender({ count: 2, isFetched: true });
    rerender({ count: 3, isFetched: true });

    expect(playChime).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when the count goes down", () => {
    const { rerender } = setup(true);
    rerender({ count: 2, isFetched: true });
    rerender({ count: 0, isFetched: true });

    expect(playChime).not.toHaveBeenCalled();
  });

  it("stays quiet when the user turned the sound off", () => {
    const { rerender } = setup(false);
    rerender({ count: 2, isFetched: true });
    rerender({ count: 3, isFetched: true });

    expect(playChime).not.toHaveBeenCalled();
  });
});
