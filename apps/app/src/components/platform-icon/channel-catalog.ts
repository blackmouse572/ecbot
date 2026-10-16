import type { AccountGetDetailResponseDto } from "@repo/client";

type AccountType = AccountGetDetailResponseDto["type"];

export type Channel = {
  key: string;
  label: string;
  /** Logo under public/icons. */
  icon: string;
  /** Series colour on dashboard charts, distinct from every other channel. */
  color: string;
  /** The account types this channel's connections can have. */
  accountTypes: AccountType[];
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
    icon: "/icons/facebook-messenger.svg",
    color: "#2563eb",
    accountTypes: ["FACEBOOK_ACCOUNT", "FACEBOOK_PAGE"],
    connectAs: "FACEBOOK_ACCOUNT",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "/icons/instagram.svg",
    color: "#db2777",
    accountTypes: ["INSTAGRAM_ACCOUNT", "INSTAGRAM_PAGE"],
    connectAs: "INSTAGRAM_ACCOUNT",
    // A build without the Instagram app id can't open Instagram Login.
    comingSoon: !import.meta.env.VITE_INSTAGRAM_APP_ID,
  },
  {
    key: "zalo",
    label: "Zalo",
    icon: "/icons/zalo.svg",
    color: "#0d9488",
    accountTypes: ["ZALO_ACCOUNT", "ZALO_PAGE"],
    connectAs: "ZALO_ACCOUNT",
  },
  {
    key: "tiktok",
    label: "TikTok Shop",
    icon: "/icons/tiktok.svg",
    color: "#64748b",
    accountTypes: ["TIKTOK_SHOP"],
    connectAs: "TIKTOK_SHOP",
    comingSoon: true,
  },
  {
    key: "shopee",
    label: "Shopee",
    icon: "/icons/shopee.svg",
    color: "#ea580c",
    accountTypes: ["SHOPEE_SHOP"],
    connectAs: "SHOPEE_SHOP",
    comingSoon: true,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: "/icons/telegram.svg",
    color: "#0ea5e9",
    accountTypes: ["TELEGRAM_BOT"],
    connectAs: "TELEGRAM_BOT",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "/icons/whatsapp.svg",
    color: "#16a34a",
    accountTypes: ["WHATSAPP_BUSINESS"],
    connectAs: "WHATSAPP_BUSINESS",
  },
  {
    key: "website",
    label: "Website",
    icon: "/icons/website-widget.svg",
    color: "#7c3aed",
    accountTypes: ["WEBSITE_WIDGET"],
    connectAs: "WEBSITE_WIDGET",
  },
  {
    key: "api",
    label: "API",
    icon: "/icons/api-channel.svg",
    color: "#ca8a04",
    accountTypes: ["API_CHANNEL"],
    connectAs: "API_CHANNEL",
  },
];

const BY_TYPE = new Map(
  CHANNELS.flatMap((c) => c.accountTypes.map((type) => [type, c] as const)),
);

/** The channel an account type belongs to, e.g. Zalo for ZALO_PAGE. */
export const channelOf = (type: AccountType): Channel =>
  BY_TYPE.get(type) ?? CHANNELS[0]!;
