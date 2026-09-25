import { useCallback, useEffect, useRef } from "react";

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

function getFacebookConfig(): PlatformConfig {
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
    url: `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${permissions}`,
    windowTitle: "Facebook Login",
  };
}

function getInstagramConfig(): PlatformConfig {
  const appId = import.meta.env.VITE_INSTAGRAM_APP_ID;
  const redirectUri = import.meta.env.VITE_INSTAGRAM_REDIRECT_URI;
  return {
    url: `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages&response_type=code`,
    windowTitle: "Instagram Login",
  };
}

function getZaloConfig(): PlatformConfig {
  const appId = import.meta.env.VITE_ZALO_APP_ID;
  const redirectUri = import.meta.env.VITE_ZALO_REDIRECT_URI;
  return {
    url: `https://oauth.zaloapp.com/v4/oa/permission?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=zalo`,
    windowTitle: "Zalo Login",
  };
}

function getTikTokShopConfig(): PlatformConfig {
  const appKey = import.meta.env.VITE_TIKTOK_APP_KEY;
  const redirectUri = import.meta.env.VITE_TIKTOK_REDIRECT_URI;
  return {
    url: `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appKey}&redirect_uri=${encodeURIComponent(redirectUri)}&state=tiktok`,
    windowTitle: "TikTok Shop Login",
  };
}

function getShopeeConfig(): PlatformConfig {
  // Shopee auth URL requires HMAC signing — use the backend-provided URL
  const redirectUri = import.meta.env.VITE_SHOPEE_REDIRECT_URI;
  return {
    url: `/api/account/shopee-auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
    windowTitle: "Shopee Login",
  };
}

const PLATFORM_CONFIGS: Record<string, () => PlatformConfig> = {
  FACEBOOK_ACCOUNT: getFacebookConfig,
  INSTAGRAM_ACCOUNT: getInstagramConfig,
  ZALO_ACCOUNT: getZaloConfig,
  TIKTOK_SHOP: getTikTokShopConfig,
  SHOPEE_SHOP: getShopeeConfig,
};

export function useOAuthLogin(
  platform: string,
  { onSuccess, onError, onClosed }: UseOAuthLoginProps,
) {
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

    const { url, windowTitle } = configFn();
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
  }, [stopPolling]);

  return { handleLinkClick };
}
