import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { createElement, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const player = vi.hoisted(() => ({ play: vi.fn(), prime: vi.fn() }));
vi.mock("./ui-sound-player", () => ({
  playUISound: player.play,
  primeUISound: player.prime,
}));

import { soundEnabledAtom } from "./state";
import { useUISound } from "./use-ui-sound";

const setup = (soundOn: boolean) => {
  const store = createStore();
  store.set(soundEnabledAtom, soundOn);
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(Provider, { store }, children);
  return renderHook(() => useUISound(), { wrapper });
};

describe("useUISound", () => {
  beforeEach(() => {
    player.play.mockReset();
    player.prime.mockReset();
  });

  it("plays when sound is on", () => {
    setup(true).result.current("send");

    expect(player.play).toHaveBeenCalledExactlyOnceWith("send");
  });

  it("stays quiet and loads nothing when the user turned sound off", () => {
    setup(false).result.current("send");

    expect(player.play).not.toHaveBeenCalled();
    expect(player.prime).not.toHaveBeenCalled();
  });
});
