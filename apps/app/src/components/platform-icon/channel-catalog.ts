import type { AccountGetDetailResponseDto } from "@repo/client";

type AccountType = AccountGetDetailResponseDto["type"];

type ChannelKey =
  | "facebook"
  | "instagram"
  | "zalo"
  | "tiktok"
  | "shopee"
  | "telegram"
  | "whatsapp"
  | "threads"
  | "website"
  | "api";

/** Platform logos under public/icons, shared with the agent builder's channel
 * icons so each path exists once. */
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
  threads: "/icons/threads.svg",
} as const;

/** Which channel each account type belongs to. A Record, so a new account type
 * from the API fails the type check until it is placed in a channel. */
const CHANNEL_OF_TYPE: Record<AccountType, ChannelKey> = {
  FACEBOOK_ACCOUNT: "facebook",
  FACEBOOK_PAGE: "facebook",
  INSTAGRAM_ACCOUNT: "instagram",
  INSTAGRAM_PAGE: "instagram",
  ZALO_ACCOUNT: "zalo",
  ZALO_PAGE: "zalo",
  TIKTOK_SHOP: "tiktok",
  SHOPEE_SHOP: "shopee",
  TELEGRAM_BOT: "telegram",
  WHATSAPP_BUSINESS: "whatsapp",
  THREADS_ACCOUNT: "threads",
  WEBSITE_WIDGET: "website",
  API_CHANNEL: "api",
};

export type Channel = {
  key: ChannelKey;
  label: string;
  /** Logo under public/icons. */
  icon: string;
  /** Series colour on dashboard charts, distinct from every other channel. */
  color: string;
  /** The account type the connect-channel page links. */
  connectAs: AccountType;
  /** Shown on the connect-channel page but not connectable yet. */
  comingSoon?: boolean;
};

/** Every chat channel, in the order the app lists them. A new channel is added
 * here once and appears on the connect-channel page, with its icon, and on the
 * dashboard. */
export const CHANNELS: Channel[] = [
  {
    key: "facebook",
    label: "Facebook",
    icon: PLATFORM_ICON_SRC.facebookMessenger,
    color: "#2563eb",
    connectAs: "FACEBOOK_ACCOUNT",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: PLATFORM_ICON_SRC.instagram,
    color: "#db2777",
    connectAs: "INSTAGRAM_ACCOUNT",
    // A build without the Instagram app id can't open Instagram Login.
    comingSoon: !import.meta.env.VITE_INSTAGRAM_APP_ID,
  },
  {
    key: "zalo",
    label: "Zalo",
    icon: PLATFORM_ICON_SRC.zalo,
    color: "#0d9488",
    connectAs: "ZALO_ACCOUNT",
  },
  {
    key: "tiktok",
    label: "TikTok Shop",
    icon: PLATFORM_ICON_SRC.tiktok,
    color: "#64748b",
    connectAs: "TIKTOK_SHOP",
    comingSoon: true,
  },
  {
    key: "shopee",
    label: "Shopee",
    icon: PLATFORM_ICON_SRC.shopee,
    color: "#ea580c",
    connectAs: "SHOPEE_SHOP",
    comingSoon: true,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: PLATFORM_ICON_SRC.telegram,
    color: "#0ea5e9",
    connectAs: "TELEGRAM_BOT",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: PLATFORM_ICON_SRC.whatsapp,
    color: "#16a34a",
    connectAs: "WHATSAPP_BUSINESS",
  },
  {
    key: "threads",
    label: "Threads",
    icon: PLATFORM_ICON_SRC.threads,
    color: "#4f46e5",
    connectAs: "THREADS_ACCOUNT",
    // A build without the Threads app id can't open Threads Login.
    comingSoon: !import.meta.env.VITE_THREADS_APP_ID,
  },
  {
    key: "website",
    label: "Website",
    icon: PLATFORM_ICON_SRC.websiteWidget,
    color: "#7c3aed",
    connectAs: "WEBSITE_WIDGET",
  },
  {
    key: "api",
    label: "API",
    icon: PLATFORM_ICON_SRC.apiChannel,
    color: "#ca8a04",
    connectAs: "API_CHANNEL",
  },
];

const BY_KEY = new Map(CHANNELS.map((c) => [c.key, c] as const));

/** The account types a channel's connections can have. */
export const accountTypesOf = (key: ChannelKey): AccountType[] =>
  (Object.keys(CHANNEL_OF_TYPE) as AccountType[]).filter(
    (type) => CHANNEL_OF_TYPE[type] === key,
  );

/** The channel an account type belongs to, e.g. Zalo for ZALO_PAGE. A type the
 * client doesn't know yet (an API ahead of the generated client) shows as Zalo,
 * as PlatformIcon did before the catalog. */
export const channelOf = (type: AccountType): Channel =>
  BY_KEY.get(CHANNEL_OF_TYPE[type] ?? "zalo")!;
