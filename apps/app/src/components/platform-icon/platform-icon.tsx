import { clx } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import type { ComponentProps } from "react";

export type AccountType = AccountGetDetailResponseDto["type"];

/** Shared platform logo paths (public/icons/*.svg) so other lookups (e.g. the
 * agent builder's channel choices) reuse these instead of duplicating them. */
export const PLATFORM_ICON_SRC = {
  facebookMessenger: "/icons/facebook-messenger.svg",
  instagram: "/icons/instagram.svg",
  zalo: "/icons/zalo.svg",
  tiktok: "/icons/tiktok.svg",
  shopee: "/icons/shopee.svg",
  telegram: "/icons/telegram.svg",
  apiChannel: "/icons/api-channel.svg",
  websiteWidget: "/icons/website-widget.svg",
  whatsapp: "/icons/whatsapp.svg",
} as const;

const ICON_BY_TYPE: Record<AccountType, { src: string; label: string }> = {
  FACEBOOK_ACCOUNT: { src: PLATFORM_ICON_SRC.facebookMessenger, label: "Facebook" },
  FACEBOOK_PAGE: { src: PLATFORM_ICON_SRC.facebookMessenger, label: "Facebook" },
  INSTAGRAM_ACCOUNT: { src: PLATFORM_ICON_SRC.instagram, label: "Instagram" },
  INSTAGRAM_PAGE: { src: PLATFORM_ICON_SRC.instagram, label: "Instagram" },
  ZALO_ACCOUNT: { src: PLATFORM_ICON_SRC.zalo, label: "Zalo" },
  ZALO_PAGE: { src: PLATFORM_ICON_SRC.zalo, label: "Zalo" },
  TIKTOK_SHOP: { src: PLATFORM_ICON_SRC.tiktok, label: "TikTok" },
  SHOPEE_SHOP: { src: PLATFORM_ICON_SRC.shopee, label: "Shopee" },
  TELEGRAM_BOT: { src: PLATFORM_ICON_SRC.telegram, label: "Telegram" },
  API_CHANNEL: { src: PLATFORM_ICON_SRC.apiChannel, label: "API" },
  WEBSITE_WIDGET: { src: PLATFORM_ICON_SRC.websiteWidget, label: "Website" },
  WHATSAPP_BUSINESS: { src: PLATFORM_ICON_SRC.whatsapp, label: "WhatsApp" },
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
