import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { END_LEAD_MS, useCountdown } from "./use-countdown";

describe("useCountdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("formats remaining time as m:ss and counts down", () => {
    const start = Date.now();
    const { result } = renderHook(() => useCountdown(start + 62_000));
    expect(result.current.label).toBe("1:02");
    expect(result.current.expired).toBe(false);

    act(() => void vi.advanceTimersByTime(60_000));
    expect(result.current.label).toBe("0:02");
  });

  it("clamps to 0:00 and reports expired", () => {
    const { result } = renderHook(() => useCountdown(Date.now() - 5_000));
    expect(result.current.label).toBe("0:00");
    expect(result.current.expired).toBe(true);
  });

  it("reports ending inside the lead window, before the token has expired", () => {
    const start = Date.now();
    const { result } = renderHook(() =>
      useCountdown(start + END_LEAD_MS + 2_000),
    );
    expect(result.current.ending).toBe(false);

    act(() => void vi.advanceTimersByTime(2_000));
    expect(result.current.ending).toBe(true);
    expect(result.current.expired).toBe(false);
  });
});
