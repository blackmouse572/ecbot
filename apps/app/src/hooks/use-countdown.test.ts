import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./use-countdown";

describe("useCountdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("counts down to zero one second at a time", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current.start(3));
    expect(result.current.secondsLeft).toBe(3);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.secondsLeft).toBe(2);

    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.secondsLeft).toBe(0);

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.secondsLeft).toBe(0);
  });

  // A tick rendered late (a busy or throttled tab) found the clock already
  // past the end while its own `now` was not, and stopped at "1s".
  it("still reaches zero when a tick renders after the end time", () => {
    const { result } = renderHook(() => useCountdown());
    act(() => result.current.start(2));

    act(() => {
      vi.advanceTimersByTime(1000); // the tick: 1s left
      vi.setSystemTime(Date.now() + 1100); // it renders after the end
    });
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.secondsLeft).toBe(0);
  });
});
