import { beforeEach, describe, expect, it, vi } from "vitest";

const player = vi.hoisted(() => ({
  play: vi.fn(),
  unlock: vi.fn(async () => true),
}));
vi.mock("uisfx", () => ({ createUISFX: () => player }));

describe("ui sound player", () => {
  beforeEach(() => {
    vi.resetModules();
    player.play.mockReset();
  });

  it("drops sounds asked for before the first click", async () => {
    const { playUISound, primeUISound } = await import("./ui-sound-player");
    await primeUISound();

    playUISound("notification");
    window.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();

    expect(player.play).not.toHaveBeenCalled();
  });

  it("plays once audio is unlocked by a click", async () => {
    const { playUISound, primeUISound } = await import("./ui-sound-player");
    await primeUISound();

    window.dispatchEvent(new Event("pointerdown"));
    await vi.waitFor(() => expect(player.unlock).toHaveBeenCalled());
    await Promise.resolve();
    playUISound("send");

    expect(player.play).toHaveBeenCalledExactlyOnceWith("send");
  });
});
