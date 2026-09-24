import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOAuthLogin } from "./use-oauth-login";

describe("useOAuthLogin — WhatsApp", () => {
  const open = vi.fn();

  beforeEach(() => {
    vi.stubEnv("VITE_FACEBOOK_APP_ID", "APP");
    vi.stubEnv(
      "VITE_FACEBOOK_REDIRECT_URI",
      "https://app.test/auth/facebook/callback",
    );
    vi.stubEnv("VITE_WHATSAPP_CONFIG_ID", "CFG");
    vi.spyOn(window, "open").mockImplementation(open);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    open.mockReset();
  });

  // A plain facebook.com popup, not Meta's JS SDK: ad-blockers stop the SDK
  // script but not a navigation to facebook.com.
  it("opens Meta's login dialog with the WhatsApp Embedded Signup configuration", () => {
    const { result } = renderHook(() => useOAuthLogin("WHATSAPP_BUSINESS", {}));

    result.current.handleLinkClick();

    const url = new URL(open.mock.calls[0][0]);
    // Same shape the JS SDK's FB.login sends, minus the SDK-only channel.
    expect(url.origin + url.pathname).toBe(
      "https://www.facebook.com/v23.0/dialog/oauth",
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "APP",
      redirect_uri: "https://app.test/auth/facebook/callback",
      config_id: "CFG",
      response_type: "code",
      override_default_response_type: "true",
      display: "popup",
    });
    // v4 sends only `setup`; `sessionInfoVersion` makes the popup report to
    // an SDK listener in the opener, which does not exist without the SDK.
    expect(JSON.parse(url.searchParams.get("extras")!)).toEqual({ setup: {} });
    expect(url.searchParams.has("scope")).toBe(false);
  });
});
