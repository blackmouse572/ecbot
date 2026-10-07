import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const endCall = vi.fn();
const refreshCall = vi.fn();
vi.mock("@repo/client", () => ({
  authSharedControllerImpersonateEndV1: (...a: unknown[]) => endCall(...a),
  authSharedControllerImpersonateRefreshV1: (...a: unknown[]) =>
    refreshCall(...a),
}));

const replace = vi.fn();
vi.stubGlobal("location", { replace } as never);

import { impersonationAtom } from "./state";
import {
  nextRefreshDelay,
  useEndImpersonation,
  useImpersonationRefresh,
} from "./hooks";

const withStore = (store: ReturnType<typeof createStore>) =>
  function Wrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  };

describe("useEndImpersonation", () => {
  beforeEach(() => {
    endCall.mockReset().mockResolvedValue({});
    replace.mockReset();
    sessionStorage.clear();
  });

  it("calls end, clears the atom, redirects to the admin user page", async () => {
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "jwt",
      expiresAt: Date.now() + 1000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "A", email: "a@x.com" },
    });
    const { result } = renderHook(() => useEndImpersonation(), {
      wrapper: withStore(store),
    });

    await result.current("manual");

    expect(endCall).toHaveBeenCalledTimes(1);
    expect(store.get(impersonationAtom)).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      `${import.meta.env.VITE_ADMIN_URL ?? ""}/users/u1`,
    );
  });

  it("sends the end reason to the API", async () => {
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "jwt",
      expiresAt: Date.now() + 5_000,
      impersonatedBy: "a",
      user: { id: "u9", name: "B", email: "b@x.com" },
    });
    const { result } = renderHook(() => useEndImpersonation(), {
      wrapper: withStore(store),
    });

    await result.current("expired");

    expect(endCall).toHaveBeenCalledWith(
      expect.objectContaining({ body: { reason: "expired" } }),
    );
  });

  it("still clears + redirects when the end call throws", async () => {
    endCall.mockRejectedValue(new Error("network"));
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "jwt",
      expiresAt: Date.now(),
      impersonatedBy: "a",
      user: { id: "u9", name: "B", email: "b@x.com" },
    });
    const { result } = renderHook(() => useEndImpersonation(), {
      wrapper: withStore(store),
    });

    await result.current("expired");

    expect(store.get(impersonationAtom)).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      `${import.meta.env.VITE_ADMIN_URL ?? ""}/users/u9`,
    );
  });
});

describe("nextRefreshDelay", () => {
  it("renews a minute before expiry for normal lifetimes", () => {
    expect(nextRefreshDelay(1_000_000 + 600_000, 1_000_000)).toBe(540_000);
  });

  it("renews at the halfway point for very short tokens", () => {
    expect(nextRefreshDelay(1_000_000 + 30_000, 1_000_000)).toBe(15_000);
  });

  it("never schedules in the past or in a tight loop", () => {
    expect(nextRefreshDelay(1_000_000 - 5_000, 1_000_000)).toBe(1_000);
  });
});

describe("useImpersonationRefresh", () => {
  const seed = (expiresInMs: number) => {
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "old",
      expiresAt: Date.now() + expiresInMs,
      impersonatedBy: "a",
      user: { id: "u9", name: "B", email: "b@x.com" },
    });
    return store;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    refreshCall.mockReset();
    endCall.mockReset().mockResolvedValue({});
    replace.mockReset();
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("swaps in the renewed token and reschedules, without ending the session", async () => {
    const store = seed(120_000);
    refreshCall.mockResolvedValue({
      data: { data: { accessToken: "new", expiresIn: 600 } },
      response: { status: 200 },
    });
    renderHook(() => useImpersonationRefresh(), { wrapper: withStore(store) });

    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));

    expect(refreshCall).toHaveBeenCalledTimes(1);
    expect(store.get(impersonationAtom)?.accessToken).toBe("new");
    expect(store.get(impersonationAtom)!.expiresAt).toBeGreaterThan(
      Date.now() + 500_000,
    );
    expect(endCall).not.toHaveBeenCalled();
  });

  it("ends the session when the server rejects the renewal (revoked / capped)", async () => {
    const store = seed(120_000);
    refreshCall.mockResolvedValue({
      error: {},
      response: { status: 401 },
    });
    renderHook(() => useImpersonationRefresh(), { wrapper: withStore(store) });

    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));

    expect(endCall).toHaveBeenCalledWith(
      expect.objectContaining({ body: { reason: "expired" } }),
    );
    expect(store.get(impersonationAtom)).toBeNull();
  });

  it("retries after a network error instead of ending the session", async () => {
    const store = seed(120_000);
    refreshCall
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        data: { data: { accessToken: "new", expiresIn: 600 } },
        response: { status: 200 },
      });
    renderHook(() => useImpersonationRefresh(), { wrapper: withStore(store) });

    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));
    expect(store.get(impersonationAtom)?.accessToken).toBe("old");
    expect(endCall).not.toHaveBeenCalled();

    await act(async () => void (await vi.advanceTimersByTimeAsync(10_000)));
    expect(store.get(impersonationAtom)?.accessToken).toBe("new");
    expect(endCall).not.toHaveBeenCalled();
  });

  it("does nothing when not impersonating", async () => {
    const store = createStore();
    renderHook(() => useImpersonationRefresh(), { wrapper: withStore(store) });

    await act(async () => void (await vi.advanceTimersByTimeAsync(600_000)));

    expect(refreshCall).not.toHaveBeenCalled();
  });
});
