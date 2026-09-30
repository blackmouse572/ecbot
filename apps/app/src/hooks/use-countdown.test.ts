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
});
