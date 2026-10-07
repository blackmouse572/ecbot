import type { ChannelId } from "@repo/agent-blueprint";
import type { AccountListResponseDto } from "@repo/client";

type AccountType = AccountListResponseDto["type"];

export type OAuthPlatform = "FACEBOOK_ACCOUNT" | "ZALO_ACCOUNT" | "INSTAGRAM_ACCOUNT";

/** How the channels question connects each channel choice to a real account. */
export type ChannelConnect =
  | { kind: "oauth"; platform: OAuthPlatform }
  | { kind: "token"; platform: "TELEGRAM_BOT" }
  | { kind: "widget" }
  | { kind: "comingSoon" };

/** The one place that maps a channel choice to how the builder connects it. */
export const CHANNEL_CONNECT: Record<ChannelId, ChannelConnect> = {
  messenger: { kind: "oauth", platform: "FACEBOOK_ACCOUNT" },
  zalo: { kind: "oauth", platform: "ZALO_ACCOUNT" },
  telegram: { kind: "token", platform: "TELEGRAM_BOT" },
  website: { kind: "widget" },
  // A build without the Instagram app id can't open Instagram Login.
  instagram: import.meta.env.VITE_INSTAGRAM_APP_ID
    ? { kind: "oauth", platform: "INSTAGRAM_ACCOUNT" }
    : { kind: "comingSoon" },
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
  // Linked from Accounts; the builder has no channel choice for them yet.
  WHATSAPP_BUSINESS: null,
  THREADS_ACCOUNT: null,
};

/** The reverse lookup: which channel choice a linked account's type belongs to. */
export function channelOfAccountType(type: AccountType): ChannelId | null {
  return ACCOUNT_TYPE_TO_CHANNEL[type] ?? null;
}

/** Personal Facebook profiles (which only parent their Pages) and legacy
 * Instagram login rows (new Instagram logins are stored as INSTAGRAM_PAGE).
 * They stay stored but never show in channel lists. */
const PERSONAL_ACCOUNT_TYPES = new Set<AccountType>([
  "FACEBOOK_ACCOUNT",
  "INSTAGRAM_ACCOUNT",
]);

export const isPersonalAccountType = (type: AccountType) =>
  PERSONAL_ACCOUNT_TYPES.has(type);

/** Whether the builder can connect this channel type to an agent: not a
 * personal profile, and not an API channel (a server integration, attached
 * from the chatbot side). */
export const isConnectableAccountType = (type: AccountType) =>
  !isPersonalAccountType(type) && type !== "API_CHANNEL";
