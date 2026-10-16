import { clx } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import type { ComponentProps } from "react";
import { channelOf } from "./channel-catalog";

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
  const channel = channelOf(type);
  return (
    <img
      src={channel.icon}
      alt={channel.label}
      title={channel.label}
      width={size}
      height={size}
      className={clx("bg-ui-bg-base rounded-full", className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
};
