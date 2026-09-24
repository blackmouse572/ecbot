import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useOAuthLogin } from "./use-oauth-login";

let seed = 0;

function stubRandomValues() {
  seed = 0;
  vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(
    (arr: A) => {
      seed += 1;
      (arr as Uint8Array).fill(seed);
      return arr;
    },
  );
}

function stateFromOpenedUrl(openMock: ReturnType<typeof vi.fn>) {
  const url = openMock.mock.calls.at(-1)?.[0] as string;
  return new URL(url, "https://example.test").searchParams.get("state");
}

function dispatchOAuthSuccess(
  payload: Record<string, unknown>,
  origin = window.location.origin,
) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type: "oauth-success", payload },
      origin,
    }),
  );
}

describe("useOAuthLogin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    stubRandomValues();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends a per-click state to the authorize URL and stores it in sessionStorage", () => {
    const { result } = renderHook(() =>
      useOAuthLogin("FACEBOOK_ACCOUNT", {}),
    );

    result.current.handleLinkClick();

    const openMock = window.open as ReturnType<typeof vi.fn>;
    const state = stateFromOpenedUrl(openMock);
    expect(state).toBeTruthy();
    expect(sessionStorage.getItem("oauth-state:FACEBOOK_ACCOUNT")).toBe(
      state,
    );
  });

  it("generates a different state on each click", () => {
    const { result } = renderHook(() =>
      useOAuthLogin("FACEBOOK_ACCOUNT", {}),
    );
    const openMock = window.open as ReturnType<typeof vi.fn>;

    result.current.handleLinkClick();
    const firstState = stateFromOpenedUrl(openMock);

    result.current.handleLinkClick();
    const secondState = stateFromOpenedUrl(openMock);

    expect(firstState).not.toBe(secondState);
  });

  it("replaces the static state on Zalo and TikTok authorize URLs", () => {
    const openMock = window.open as ReturnType<typeof vi.fn>;

    const { result: zalo } = renderHook(() =>
      useOAuthLogin("ZALO_ACCOUNT", {}),
    );
    zalo.current.handleLinkClick();
    const zaloUrl = openMock.mock.calls.at(-1)?.[0] as string;
    expect(zaloUrl).not.toContain("state=zalo");
    expect(new URL(zaloUrl).searchParams.get("state")).toBeTruthy();

    const { result: tiktok } = renderHook(() =>
      useOAuthLogin("TIKTOK_SHOP", {}),
    );
    tiktok.current.handleLinkClick();
    const tiktokUrl = openMock.mock.calls.at(-1)?.[0] as string;
    expect(tiktokUrl).not.toContain("state=tiktok");
    expect(new URL(tiktokUrl).searchParams.get("state")).toBeTruthy();
  });

  it("calls onSuccess when the callback state matches the stored state", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useOAuthLogin("FACEBOOK_ACCOUNT", { onSuccess, onError }),
    );

    result.current.handleLinkClick();
    const openMock = window.open as ReturnType<typeof vi.fn>;
    const state = stateFromOpenedUrl(openMock);

    dispatchOAuthSuccess({ code: "abc", state });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ code: "abc" }),
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError and not onSuccess when the state is missing", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useOAuthLogin("FACEBOOK_ACCOUNT", { onSuccess, onError }),
    );

    result.current.handleLinkClick();
    dispatchOAuthSuccess({ code: "abc" });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it("calls onError and not onSuccess when the state does not match", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useOAuthLogin("FACEBOOK_ACCOUNT", { onSuccess, onError }),
    );

    result.current.handleLinkClick();
    dispatchOAuthSuccess({ code: "abc", state: "not-the-real-state" });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it("ignores a replayed message reusing an already-consumed state", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useOAuthLogin("FACEBOOK_ACCOUNT", { onSuccess, onError }),
    );

    result.current.handleLinkClick();
    const openMock = window.open as ReturnType<typeof vi.fn>;
    const state = stateFromOpenedUrl(openMock);

    dispatchOAuthSuccess({ code: "abc", state });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    dispatchOAuthSuccess({ code: "abc", state });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("ignores messages from a different origin", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useOAuthLogin("FACEBOOK_ACCOUNT", { onSuccess, onError }),
    );

    result.current.handleLinkClick();
    const openMock = window.open as ReturnType<typeof vi.fn>;
    const state = stateFromOpenedUrl(openMock);

    dispatchOAuthSuccess({ code: "abc", state }, "https://evil.example");

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
