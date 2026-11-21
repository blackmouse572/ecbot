import { getDefaultStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refreshFn, requestFn, responseUse } = vi.hoisted(() => ({
  refreshFn: vi.fn(),
  requestFn: vi.fn(),
  responseUse: vi.fn(),
}));

vi.mock("@repo/client", () => ({
  authSharedControllerRefreshV1: refreshFn,
  client: {
    instance: {
      request: requestFn,
      interceptors: { response: { use: responseUse } },
    },
  },
}));

import { impersonationAtom } from "@/modules/impersonation";
import {
  handleAuthError,
  registerAuthResponseInterceptor,
  setAuthSessionHandlers,
} from "./response-interceptor";
import { logoutGuard, tokenAtom } from "./state";

const store = getDefaultStore();

const unauthorized = (url = "/api/v1/workspace/list", token = "stale") => ({
  response: { status: 401 },
  request: { responseURL: url },
  config: { url, headers: { Authorization: `Bearer ${token}` } },
});

const refreshed = (accessToken: string) => ({
  data: { data: { accessToken, tokenType: "Bearer", expiresIn: 15 } },
});

const refreshRejected = (statusCode: number) => ({
  data: null,
  error: { statusCode, message: "refresh failed" },
});

describe("handleAuthError", () => {
  const onSessionExpired = vi.fn();
  const onImpersonationExpired = vi.fn();

  beforeEach(() => {
    refreshFn.mockReset();
    requestFn.mockReset();
    onSessionExpired.mockReset().mockResolvedValue(undefined);
    onImpersonationExpired.mockReset();
    logoutGuard.current = false;
    store.set(tokenAtom, "stale");
    store.set(impersonationAtom, null);
    setAuthSessionHandlers({ onSessionExpired, onImpersonationExpired });
  });

  afterEach(() => setAuthSessionHandlers(null));

  it("is registered on the shared client's response chain", () => {
    registerAuthResponseInterceptor();
    expect(responseUse).toHaveBeenCalledWith(
      expect.any(Function),
      handleAuthError,
    );
  });

  it("refreshes with the cookie on a 401, stores the new token and retries the request once", async () => {
    refreshFn.mockResolvedValue(refreshed("fresh"));
    requestFn.mockResolvedValue({ data: "workspaces" });

    const result = await handleAuthError(unauthorized());

    expect(result).toEqual({ data: "workspaces" });
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(refreshFn).toHaveBeenCalledWith(
      expect.objectContaining({
        withCredentials: true,
        headers: { Authorization: null },
      }),
    );
    expect(store.get(tokenAtom)).toBe("fresh");
    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(requestFn.mock.calls[0][0]).toMatchObject({
      url: "/api/v1/workspace/list",
      headers: { Authorization: "Bearer fresh" },
    });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("shares one refresh between concurrent 401s", async () => {
    let resolve!: (value: unknown) => void;
    refreshFn.mockReturnValue(new Promise((r) => (resolve = r)));
    requestFn.mockResolvedValue({ data: "ok" });

    const pending = [
      handleAuthError(unauthorized("/api/v1/workspace/list")),
      handleAuthError(unauthorized("/api/v1/user/me")),
      handleAuthError(unauthorized("/api/v1/notification/list")),
    ];
    resolve(refreshed("fresh"));
    await Promise.all(pending);

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(requestFn).toHaveBeenCalledTimes(3);
  });

  it("retries without refreshing when another request already renewed the token", async () => {
    store.set(tokenAtom, "fresh");
    requestFn.mockResolvedValue({ data: "ok" });

    await handleAuthError(unauthorized("/api/v1/user/me", "stale"));

    expect(refreshFn).not.toHaveBeenCalled();
    expect(requestFn.mock.calls[0][0]).toMatchObject({
      headers: { Authorization: "Bearer fresh" },
    });
  });

  it("ends the session when the refresh fails, passing the refresh error code", async () => {
    refreshFn.mockResolvedValue(refreshRejected(5159));
    const error = unauthorized();

    await expect(handleAuthError(error)).rejects.toBe(error);

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledWith(5159);
    expect(requestFn).not.toHaveBeenCalled();
  });

  it("ends the session once, not per request, when concurrent refreshes fail", async () => {
    refreshFn.mockResolvedValue(refreshRejected(401));

    await Promise.allSettled([
      handleAuthError(unauthorized("/api/v1/workspace/list")),
      handleAuthError(unauthorized("/api/v1/user/me")),
    ]);

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("ends the session instead of refreshing again when the retried request is still 401", async () => {
    refreshFn.mockResolvedValue(refreshed("fresh"));
    // The retry goes back through the interceptor chain, as axios would.
    requestFn.mockImplementation((config) =>
      handleAuthError({
        response: { status: 401 },
        request: { responseURL: config.url },
        config,
      }),
    );
    const error = unauthorized();

    await expect(handleAuthError(error)).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("passes non-401 errors through untouched", async () => {
    const error = { ...unauthorized(), response: { status: 403 } };

    await expect(handleAuthError(error)).rejects.toBe(error);

    expect(refreshFn).not.toHaveBeenCalled();
  });

  it.each([
    "/api/v1/shared/auth/refresh",
    "/api/v1/shared/auth/impersonate/end",
    "/api/v1/shared/auth/impersonate/refresh",
    // Public endpoints whose callers render their 401 (review on #572).
    "/api/v1/public/auth/login/mfa",
    "/api/v1/public/auth/impersonate/exchange",
    "/api/v1/public/chatbots/preview/share-token",
  ])("does not refresh on a 401 from %s", async (url) => {
    const error = unauthorized(url);

    await expect(handleAuthError(error)).rejects.toBe(error);

    expect(refreshFn).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not refresh a 401 on a request sent without a token", async () => {
    store.set(tokenAtom, null);
    const error = {
      ...unauthorized(),
      config: { url: "/api/v1/user/me", headers: {} },
    };

    await expect(handleAuthError(error)).rejects.toBe(error);

    expect(refreshFn).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not refresh when there is no stored token, even if the request carried one", async () => {
    store.set(tokenAtom, null);
    const error = unauthorized("/api/v1/user/me", "stale");

    await expect(handleAuthError(error)).rejects.toBe(error);

    expect(refreshFn).not.toHaveBeenCalled();
    expect(requestFn).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("skips refreshing while a logout is in flight", async () => {
    logoutGuard.current = true;
    const error = unauthorized();

    await expect(handleAuthError(error)).rejects.toBe(error);

    expect(refreshFn).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("ends the impersonation instead of refreshing while impersonating", async () => {
    store.set(impersonationAtom, {
      accessToken: "imp",
      expiresAt: Date.now() + 60_000,
      impersonatedBy: "a",
      user: { id: "u1", name: "A", email: "a@x.com" },
    });
    const error = unauthorized();

    await expect(handleAuthError(error)).rejects.toBe(error);

    expect(onImpersonationExpired).toHaveBeenCalledTimes(1);
    expect(refreshFn).not.toHaveBeenCalled();
  });
});

describe("handleAuthError before React mounts", () => {
  const replace = vi.fn();

  beforeEach(() => {
    refreshFn.mockReset();
    replace.mockReset();
    logoutGuard.current = false;
    store.set(tokenAtom, "stale");
    store.set(impersonationAtom, null);
    setAuthSessionHandlers(null);
    vi.stubGlobal("location", {
      pathname: "/kunmart/dashboard",
      search: "?tab=1",
      replace,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("clears the stored token and sends the user to /login with a return path when the refresh fails", async () => {
    refreshFn.mockResolvedValue(refreshRejected(401));

    // The default handler never settles: the page is unloading, and settling
    // would let the route's error boundary render first.
    void handleAuthError(unauthorized());
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1));

    expect(store.get(tokenAtom)).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      "/login?redirect=%2Fkunmart%2Fdashboard%3Ftab%3D1",
    );
  });
});
