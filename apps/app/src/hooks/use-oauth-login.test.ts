import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOAuthLogin } from "./use-oauth-login";

function fakePopup(closed = false) {
  return { closed } as Window;
}

function postMessage(type: string, payload?: unknown) {
  window.dispatchEvent(
    new MessageEvent("message", { origin: window.location.origin, data: { type, payload } }),
  );
}

describe("useOAuthLogin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reports an error immediately when the popup is blocked (window.open returns null)", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const onError = vi.fn();
    const onClosed = vi.fn();
    const { result } = renderHook(() => useOAuthLogin("FACEBOOK_ACCOUNT", { onError, onClosed }));

    result.current.handleLinkClick();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("reports 'closed' (not an error) when the popup closes without ever sending a message", () => {
    const popup = fakePopup(false);
    vi.spyOn(window, "open").mockReturnValue(popup);
    const onError = vi.fn();
    const onClosed = vi.fn();
    const { result } = renderHook(() => useOAuthLogin("FACEBOOK_ACCOUNT", { onError, onClosed }));

    result.current.handleLinkClick();
    expect(onClosed).not.toHaveBeenCalled();

    (popup as { closed: boolean }).closed = true;
    vi.advanceTimersByTime(500);

    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not report 'closed' after a success message, even if the popup closes afterwards", () => {
    const popup = fakePopup(false);
    vi.spyOn(window, "open").mockReturnValue(popup);
    const onSuccess = vi.fn();
    const onClosed = vi.fn();
    const { result } = renderHook(() => useOAuthLogin("FACEBOOK_ACCOUNT", { onSuccess, onClosed }));

    result.current.handleLinkClick();
    postMessage("oauth-success", { code: "abc" });
    expect(onSuccess).toHaveBeenCalledWith({ code: "abc" });

    (popup as { closed: boolean }).closed = true;
    vi.advanceTimersByTime(1000);

    expect(onClosed).not.toHaveBeenCalled();
  });

  it("still reports onError for an oauth-error message", () => {
    vi.spyOn(window, "open").mockReturnValue(fakePopup(false));
    const onError = vi.fn();
    const { result } = renderHook(() => useOAuthLogin("FACEBOOK_ACCOUNT", { onError }));

    result.current.handleLinkClick();
    postMessage("oauth-error", { error: "denied" });

    expect(onError).toHaveBeenCalledWith("denied");
  });
});
