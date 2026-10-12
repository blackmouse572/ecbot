import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const play = vi.hoisted(() => vi.fn());
vi.mock("./use-ui-sound", () => ({ useUISound: () => play }));

import { useSoundOnChange } from "./use-sound-on-change";

const pick = (previous: string, next: string) =>
  previous === "PROCESSING" && next === "COMPLETED"
    ? ("success" as const)
    : null;

const setup = (value: string | undefined, resetKey = "a") =>
  renderHook(
    (props: { value: string | undefined; resetKey: string }) =>
      useSoundOnChange(props.value, pick, props.resetKey),
    { initialProps: { value, resetKey } },
  );

describe("useSoundOnChange", () => {
  beforeEach(() => play.mockReset());

  it("plays the picked cue when the value changes", () => {
    const { rerender } = setup("PROCESSING");
    rerender({ value: "COMPLETED", resetKey: "a" });

    expect(play).toHaveBeenCalledExactlyOnceWith("success");
  });

  it("stays quiet on the first value, even after a loading gap", () => {
    const { rerender } = setup(undefined);
    rerender({ value: "COMPLETED", resetKey: "a" });

    expect(play).not.toHaveBeenCalled();
  });

  it("starts over without a sound when the reset key changes", () => {
    const { rerender } = setup("PROCESSING");
    rerender({ value: "COMPLETED", resetKey: "b" });

    expect(play).not.toHaveBeenCalled();
  });

  it("stays quiet when the picker returns nothing", () => {
    const { rerender } = setup("DRAFT");
    rerender({ value: "COMPLETED", resetKey: "a" });

    expect(play).not.toHaveBeenCalled();
  });
});
