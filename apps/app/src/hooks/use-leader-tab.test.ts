import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsLeaderTab } from "./use-leader-tab";

describe("useIsLeaderTab", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("leads when the browser has no Web Locks", () => {
    vi.stubGlobal("navigator", { ...navigator, locks: undefined });
    const { result } = renderHook(() => useIsLeaderTab("lock"));

    expect(result.current).toBe(true);
  });

  it("leads once it holds the lock, and releases it on unmount", async () => {
    let held: Promise<void> | undefined;
    const request = vi.fn(
      (_name: string, _options: unknown, callback: () => Promise<void>) => {
        held = callback();
        return held;
      },
    );
    vi.stubGlobal("navigator", { ...navigator, locks: { request } });

    const { result, unmount } = renderHook(() => useIsLeaderTab("lock"));
    await waitFor(() => expect(result.current).toBe(true));

    unmount();
    await expect(held).resolves.toBeUndefined();
  });

  it("follows while another tab holds the lock", () => {
    const request = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("navigator", { ...navigator, locks: { request } });
    const { result } = renderHook(() => useIsLeaderTab("lock"));

    expect(result.current).toBe(false);
  });
});
