import { useCallback, useEffect, useMemo } from "react";

type UseLinkAccountProps = {
  onSuccess?: (data: A) => void;
  onError?: (error: A) => void;
  permissions?: string[];
};
export function useLoginFacebook({
  onSuccess,
  onError,
  permissions = [
    "pages_messaging",
    "pages_messaging_subscriptions",
    "pages_manage_metadata",
    "pages_manage_engagement",
    "pages_read_user_content",
    "pages_manage_posts",
    "pages_manage_ads",
    "business_management",
  ],
}: UseLinkAccountProps) {
  const linkUrl = useMemo(() => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    const redirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI;
    return `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${permissions.join(",")}`;
  }, [permissions]);

  const handleLinkClick = useCallback(() => {
    const width = 600;
    const height = 700;
    const left = window.innerWidth / 2 - width / 2 + window.screenX;
    const top = window.innerHeight / 2 - height / 2 + window.screenY;
    window.open(
      linkUrl,
      "Facebook Link",
      `width=${width},height=${height},top=${top},left=${left}`,
    );
  }, [linkUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const { data } = event;
      if (data.type === "facebook-auth-success") {
        onSuccess?.(data.payload);
      } else if (data.type === "facebook-auth-error") {
        onError?.(data.payload.error);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    handleLinkClick,
  };
}
