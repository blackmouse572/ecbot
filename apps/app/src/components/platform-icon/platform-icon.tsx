import { clx } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import type { ComponentProps } from "react";

export type AccountType = AccountGetDetailResponseDto["type"];

const ICON_BY_TYPE: Record<AccountType, { src: string; label: string }> = {
  FACEBOOK_ACCOUNT: { src: "/icons/facebook-messenger.svg", label: "Facebook" },
  FACEBOOK_PAGE: { src: "/icons/facebook-messenger.svg", label: "Facebook" },
  INSTAGRAM_ACCOUNT: { src: "/icons/instagram.svg", label: "Instagram" },
  INSTAGRAM_PAGE: { src: "/icons/instagram.svg", label: "Instagram" },
  ZALO_ACCOUNT: { src: "/icons/zalo.svg", label: "Zalo" },
  ZALO_PAGE: { src: "/icons/zalo.svg", label: "Zalo" },
  TIKTOK_SHOP: { src: "/icons/tiktok.svg", label: "TikTok" },
  SHOPEE_SHOP: { src: "/icons/shopee.svg", label: "Shopee" },
  TELEGRAM_BOT: { src: "/icons/telegram.svg", label: "Telegram" },
  API_CHANNEL: { src: "/icons/api-channel.svg", label: "API" },
  WEBSITE_WIDGET: { src: "/icons/website-widget.svg", label: "Website" },
};

interface PlatformIconProps extends Omit<ComponentProps<"img">, "src" | "alt"> {
  type?: AccountType | null;
  size?: number; // px, default 14
}

export const PlatformIcon = ({
  type,
  size = 14,
  className,
  style,
  ...rest
}: PlatformIconProps) => {
  if (!type) return null;
  const meta = ICON_BY_TYPE[type] ?? ICON_BY_TYPE["ZALO_PAGE"];
  return (
    <img
      src={meta.src}
      alt={meta.label}
      title={meta.label}
      width={size}
      height={size}
      className={clx("bg-ui-bg-base rounded-full", className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
};
