import { focusManager } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePausePollingWhenIdle } from "./use-pause-polling-when-idle";

const FIVE_MINUTES = 5 * 60_000;

describe("usePausePollingWhenIdle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    focusManager.setFocused(undefined);
  });

  it("stops polling after five minutes without input", () => {
    renderHook(() => usePausePollingWhenIdle());
    expect(focusManager.isFocused()).toBe(true);

    act(() => vi.advanceTimersByTime(FIVE_MINUTES - 60_000));
    expect(focusManager.isFocused()).toBe(true);

    act(() => vi.advanceTimersByTime(60_000));
    expect(focusManager.isFocused()).toBe(false);
  });

  it("resumes and refetches on the next input", () => {
    const onFocus = vi.fn();
    const unsubscribe = focusManager.subscribe(onFocus);
    renderHook(() => usePausePollingWhenIdle());
    act(() => vi.advanceTimersByTime(FIVE_MINUTES));
    onFocus.mockClear();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown"));
    });

    expect(focusManager.isFocused()).toBe(true);
    expect(onFocus).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it("keeps polling while the user is active", () => {
    renderHook(() => usePausePollingWhenIdle());

    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.advanceTimersByTime(60_000);
        window.dispatchEvent(new Event("pointermove"));
      });
    }

    expect(focusManager.isFocused()).toBe(true);
  });

  it("hands focus back to the browser on unmount", () => {
    const { unmount } = renderHook(() => usePausePollingWhenIdle());
    act(() => vi.advanceTimersByTime(FIVE_MINUTES));

    unmount();

    expect(focusManager.isFocused()).toBe(true);
  });
});
