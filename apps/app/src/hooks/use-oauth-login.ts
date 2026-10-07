import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

type UseOAuthLoginProps = {
  onSuccess?: (data: { code: string }) => void;
  onError?: (error: string) => void;
  /** The popup closed on its own, without ever sending a message. Not
   * treated as an error, the person may have just changed their mind. */
  onClosed?: () => void;
};

const POPUP_POLL_MS = 500;

type PlatformConfig = {
  url: string;
  windowTitle: string;
};

function getFacebookConfig(state: string): PlatformConfig {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const redirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI;
  const permissions = [
    "pages_messaging",
    "pages_messaging_subscriptions",
    "pages_manage_metadata",
    "pages_manage_engagement",
    "pages_read_user_content",
    "pages_manage_posts",
    "pages_manage_ads",
    "business_management",
  ].join(",");
  return {
    url: `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${permissions}&state=${state}`,
    windowTitle: "Facebook Login",
  };
}

const WHATSAPP_GRAPH_API_VERSION = "v23.0";

// WhatsApp Embedded Signup opened as a plain facebook.com popup rather than
// through Meta's JS SDK, which ad-blockers stop. The config_id replaces scopes;
// the redirect carries only a code, so the backend finds the shared WhatsApp
// Business account and numbers itself. Reuses the Facebook callback page.
function getWhatsAppConfig(): PlatformConfig {
  // Mirrors what FB.login sends for Embedded Signup v4, minus the SDK's own
  // response channel: our redirect_uri receives the code instead.
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_FACEBOOK_APP_ID,
    redirect_uri: import.meta.env.VITE_FACEBOOK_REDIRECT_URI,
    config_id: import.meta.env.VITE_WHATSAPP_CONFIG_ID,
    response_type: "code",
    override_default_response_type: "true",
    display: "popup",
    // v4 sends only `setup`. `sessionInfoVersion` would make the popup report
    // to an SDK listener in this window, which does not exist without the SDK.
    extras: JSON.stringify({ setup: {} }),
  });
  return {
    url: `https://www.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/dialog/oauth?${params}`,
    windowTitle: "WhatsApp Signup",
  };
}

function getInstagramConfig(state: string): PlatformConfig {
  const appId = import.meta.env.VITE_INSTAGRAM_APP_ID;
  const redirectUri = import.meta.env.VITE_INSTAGRAM_REDIRECT_URI;
  return {
    url: `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages&response_type=code&state=${state}`,
    windowTitle: "Instagram Login",
  };
}

// Threads Login: replies and mentions arrive by webhook once the profile
// grants these, and the bot answers with threads_manage_replies.
function getThreadsConfig(state: string): PlatformConfig {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_THREADS_APP_ID,
    redirect_uri: import.meta.env.VITE_THREADS_REDIRECT_URI,
    scope: [
      "threads_basic",
      "threads_read_replies",
      "threads_manage_replies",
      "threads_manage_mentions",
    ].join(","),
    response_type: "code",
    state,
  });
  return {
    url: `https://threads.net/oauth/authorize?${params}`,
    windowTitle: "Threads Login",
  };
}

function getZaloConfig(state: string): PlatformConfig {
  const appId = import.meta.env.VITE_ZALO_APP_ID;
  const redirectUri = import.meta.env.VITE_ZALO_REDIRECT_URI;
  return {
    url: `https://oauth.zaloapp.com/v4/oa/permission?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    windowTitle: "Zalo Login",
  };
}

function getTikTokShopConfig(state: string): PlatformConfig {
  const appKey = import.meta.env.VITE_TIKTOK_APP_KEY;
  const redirectUri = import.meta.env.VITE_TIKTOK_REDIRECT_URI;
  return {
    url: `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appKey}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    windowTitle: "TikTok Shop Login",
  };
}

function getShopeeConfig(): PlatformConfig {
  // Shopee auth URL requires HMAC signing — use the backend-provided URL,
  // which builds its own redirect. We don't append or verify state here.
  const redirectUri = import.meta.env.VITE_SHOPEE_REDIRECT_URI;
  return {
    url: `/api/account/shopee-auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
    windowTitle: "Shopee Login",
  };
}

const PLATFORM_CONFIGS: Record<string, (state: string) => PlatformConfig> = {
  FACEBOOK_ACCOUNT: getFacebookConfig,
  INSTAGRAM_ACCOUNT: getInstagramConfig,
  ZALO_ACCOUNT: getZaloConfig,
  TIKTOK_SHOP: getTikTokShopConfig,
  SHOPEE_SHOP: getShopeeConfig,
  WHATSAPP_BUSINESS: getWhatsAppConfig,
  THREADS_ACCOUNT: getThreadsConfig,
};

// Platforms whose authorize URL we build ourselves, so we can bind a
// per-click state to the popup and verify it comes back unchanged. Shopee's
// URL is server-built (see getShopeeConfig) and out of scope for this check.
const STATEFUL_PLATFORMS = new Set([
  "FACEBOOK_ACCOUNT",
  "INSTAGRAM_ACCOUNT",
  "ZALO_ACCOUNT",
  "TIKTOK_SHOP",
  "THREADS_ACCOUNT",
]);

function oauthStateKey(platform: string) {
  return `oauth-state:${platform}`;
}

function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function useOAuthLogin(
  platform: string,
  { onSuccess, onError, onClosed }: UseOAuthLoginProps,
) {
  const { t } = useTranslation();

  // A ref so the popup poll and the message listener always call the
  // latest handlers without re-subscribing (and re-opening a new listener)
  // on every render.
  const handlers = useRef({ onSuccess, onError, onClosed });
  handlers.current = { onSuccess, onError, onClosed };

  const pollRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  // True once a message (success or error) settled this popup, so a
  // `closed` detected afterwards (the popup closing itself, or the person
  // closing it after seeing a result) is never reported as `onClosed` too.
  const settledRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleLinkClick = useCallback(() => {
    const configFn = PLATFORM_CONFIGS[platform];
    if (!configFn) {
      handlers.current.onError?.(`Unsupported platform: ${platform}`);
      return;
    }

    const state = generateState();
    if (STATEFUL_PLATFORMS.has(platform)) {
      sessionStorage.setItem(oauthStateKey(platform), state);
    }

    const { url, windowTitle } = configFn(state);
    const width = 600;
    const height = 700;
    const left = window.innerWidth / 2 - width / 2 + window.screenX;
    const top = window.innerHeight / 2 - height / 2 + window.screenY;

    const popup = window.open(
      url,
      windowTitle,
      `width=${width},height=${height},top=${top},left=${left}`,
    );

    if (!popup) {
      handlers.current.onError?.("popup-blocked");
      return;
    }

    stopPolling();
    settledRef.current = false;
    pollRef.current = window.setInterval(() => {
      if (!popup.closed) return;
      stopPolling();
      if (!settledRef.current) handlers.current.onClosed?.();
    }, POPUP_POLL_MS);
  }, [platform, stopPolling]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { data } = event;
      if (data.type === "oauth-success") {
        settledRef.current = true;
        stopPolling();
        if (STATEFUL_PLATFORMS.has(platform)) {
          const key = oauthStateKey(platform);
          const expectedState = sessionStorage.getItem(key);
          sessionStorage.removeItem(key);
          if (!expectedState || data.payload?.state !== expectedState) {
            handlers.current.onError?.(t("accounts.link.invalidState"));
            return;
          }
        }
        handlers.current.onSuccess?.(data.payload);
      } else if (data.type === "oauth-error") {
        settledRef.current = true;
        stopPolling();
        handlers.current.onError?.(data.payload?.error ?? "Unknown error");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      stopPolling();
    };
  }, [platform, stopPolling, t]);

  return { handleLinkClick };
}
