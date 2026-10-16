import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNowAt } from "./use-now-at";

describe("useNowAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("re-renders with a fresh time once the deadline passes", () => {
    const start = Date.now();
    const { result } = renderHook(() => useNowAt(start + 5000));
    expect(result.current).toBe(start);

    act(() => vi.advanceTimersByTime(4999));
    expect(result.current).toBe(start);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBeGreaterThanOrEqual(start + 5000);
  });

  it("schedules nothing without a deadline", () => {
    renderHook(() => useNowAt(undefined));
    expect(vi.getTimerCount()).toBe(0);
  });
});
