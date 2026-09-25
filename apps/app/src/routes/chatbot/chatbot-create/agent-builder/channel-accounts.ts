import type { ChannelId } from "@repo/agent-blueprint";
import type { AccountListResponseDto } from "@repo/client";

type AccountType = AccountListResponseDto["type"];

/** How the channels question connects each channel choice to a real account. */
export type ChannelConnect =
  | { kind: "oauth"; platform: "FACEBOOK_ACCOUNT" | "ZALO_ACCOUNT" }
  | { kind: "token"; platform: "TELEGRAM_BOT" }
  | { kind: "widget" }
  | { kind: "comingSoon" };

/** The one place that maps a channel choice to how the builder connects it. */
export const CHANNEL_CONNECT: Record<ChannelId, ChannelConnect> = {
  messenger: { kind: "oauth", platform: "FACEBOOK_ACCOUNT" },
  zalo: { kind: "oauth", platform: "ZALO_ACCOUNT" },
  telegram: { kind: "token", platform: "TELEGRAM_BOT" },
  website: { kind: "widget" },
  instagram: { kind: "comingSoon" },
  tiktok: { kind: "comingSoon" },
  shopee: { kind: "comingSoon" },
};

const ACCOUNT_TYPE_TO_CHANNEL: Record<AccountType, ChannelId | null> = {
  FACEBOOK_ACCOUNT: "messenger",
  FACEBOOK_PAGE: "messenger",
  ZALO_ACCOUNT: "zalo",
  ZALO_PAGE: "zalo",
  TELEGRAM_BOT: "telegram",
  WEBSITE_WIDGET: "website",
  INSTAGRAM_ACCOUNT: "instagram",
  INSTAGRAM_PAGE: "instagram",
  TIKTOK_SHOP: "tiktok",
  SHOPEE_SHOP: "shopee",
  API_CHANNEL: null,
};

/** The reverse lookup: which channel choice a linked account's type belongs to. */
export function channelOfAccountType(type: AccountType): ChannelId | null {
  return ACCOUNT_TYPE_TO_CHANNEL[type] ?? null;
}
