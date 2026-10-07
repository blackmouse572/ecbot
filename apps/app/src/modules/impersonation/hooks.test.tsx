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

import { ADMIN_URL, impersonationAtom } from "./state";
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

  it("calls end with no body, clears the atom, redirects to the admin user page", async () => {
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

    await result.current();

    expect(endCall).toHaveBeenCalledTimes(1);
    expect(endCall).toHaveBeenCalledWith({ throwOnError: false });
    expect(store.get(impersonationAtom)).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      ADMIN_URL ? `${ADMIN_URL}/users/u1` : "/",
    );
  });

  it("redirects to the app root when no admin URL is configured", async () => {
    vi.stubEnv("VITE_ADMIN_URL", "");
    vi.resetModules();
    const { useEndImpersonation: useEnd } = await import("./hooks");
    const { impersonationAtom: atom } = await import("./state");
    const store = createStore();
    store.set(atom, {
      accessToken: "jwt",
      expiresAt: Date.now() + 5_000,
      impersonatedBy: "a",
      user: { id: "u9", name: "B", email: "b@x.com" },
    });
    const { result } = renderHook(() => useEnd(), {
      wrapper: withStore(store),
    });

    await result.current();

    expect(replace).toHaveBeenCalledWith("/");
    vi.unstubAllEnvs();
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

    await result.current();

    expect(store.get(impersonationAtom)).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      ADMIN_URL ? `${ADMIN_URL}/users/u9` : "/",
    );
  });
});

describe("nextRefreshDelay", () => {
  const now = 1_000_000;

  it("renews a minute before expiry for normal lifetimes", () => {
    expect(nextRefreshDelay(now + 600_000, undefined, now)).toBe(540_000);
    expect(nextRefreshDelay(now + 600_000, now + 3_600_000, now)).toBe(540_000);
  });

  it("renews at the halfway point for very short tokens", () => {
    expect(nextRefreshDelay(now + 30_000, undefined, now)).toBe(15_000);
  });

  it("never schedules in the past", () => {
    expect(nextRefreshDelay(now - 5_000, undefined, now)).toBe(0);
  });

  it("never schedules later than a second before expiry", () => {
    expect(nextRefreshDelay(now + 1_500, undefined, now)).toBe(500);
  });

  it("schedules one final call at the end when the token runs to the session cap", () => {
    expect(nextRefreshDelay(now + 600_000, now + 600_000, now)).toBe(599_000);
    // within the 1.5s tolerance of the cap
    expect(nextRefreshDelay(now + 600_000, now + 601_000, now)).toBe(599_000);
    expect(nextRefreshDelay(now + 600_000, now + 601_500, now)).toBe(599_000);
  });

  it("clamps the final call to now when the end is imminent", () => {
    expect(nextRefreshDelay(now + 500, now + 500, now)).toBe(0);
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

  it("stores the new sessionEndsAt and keeps sessions without one working", async () => {
    const store = seed(120_000);
    refreshCall.mockResolvedValue({
      data: {
        data: { accessToken: "new", expiresIn: 600, sessionEndsAt: 9_999_999 },
      },
      response: { status: 200 },
    });
    renderHook(() => useImpersonationRefresh(), { wrapper: withStore(store) });

    expect(store.get(impersonationAtom)?.sessionEndsAt).toBeUndefined();
    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));

    expect(store.get(impersonationAtom)?.sessionEndsAt).toBe(9_999_999);
  });

  it("makes exactly one final call when the token runs to the session cap", async () => {
    const store = createStore();
    store.set(impersonationAtom, {
      accessToken: "old",
      expiresAt: Date.now() + 120_000,
      sessionEndsAt: Date.now() + 120_000,
      impersonatedBy: "a",
      user: { id: "u9", name: "B", email: "b@x.com" },
    });
    refreshCall.mockResolvedValue({ error: {}, response: { status: 401 } });
    renderHook(() => useImpersonationRefresh(), { wrapper: withStore(store) });

    await act(async () => void (await vi.advanceTimersByTimeAsync(118_000)));
    expect(refreshCall).not.toHaveBeenCalled();

    await act(async () => void (await vi.advanceTimersByTimeAsync(1_500)));
    expect(refreshCall).toHaveBeenCalledTimes(1);
    expect(endCall).toHaveBeenCalledTimes(1);
  });

  it("ends the session when the server rejects the renewal (revoked / capped)", async () => {
    const store = seed(120_000);
    refreshCall.mockResolvedValue({
      error: {},
      response: { status: 401 },
    });
    renderHook(() => useImpersonationRefresh(), { wrapper: withStore(store) });

    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));

    expect(endCall).toHaveBeenCalledWith({ throwOnError: false });
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
