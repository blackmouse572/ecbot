import { useCallback, useEffect } from "react";

type UseOAuthLoginProps = {
  onSuccess?: (data: { code: string }) => void;
  onError?: (error: string) => void;
};

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
  { onSuccess, onError }: UseOAuthLoginProps,
) {
  const handleLinkClick = useCallback(() => {
    const configFn = PLATFORM_CONFIGS[platform];
    if (!configFn) {
      onError?.(`Unsupported platform: ${platform}`);
      return;
    }

    const { url, windowTitle } = configFn();
    const width = 600;
    const height = 700;
    const left = window.innerWidth / 2 - width / 2 + window.screenX;
    const top = window.innerHeight / 2 - height / 2 + window.screenY;

    window.open(
      url,
      windowTitle,
      `width=${width},height=${height},top=${top},left=${left}`,
    );
  }, [platform, onError]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { data } = event;
      if (data.type === "oauth-success") {
        onSuccess?.(data.payload);
      } else if (data.type === "oauth-error") {
        onError?.(data.payload?.error ?? "Unknown error");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { handleLinkClick };
}
