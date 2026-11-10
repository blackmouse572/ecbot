import type { TrackedLinkGetResponseDto } from "@/hooks/api/tracked-links";

type AccountType = TrackedLinkGetResponseDto["account"]["type"];

export const SOURCE_CONSTANTS = {
  PAGE_SIZE: 20,
} as const;

export const SOURCE_QUERY_PARAMS = ["page", "search", "status", "account"];

/** Channels whose links can open a chat carrying a code (matches the API). */
export const SOURCE_ACCOUNT_TYPES: AccountType[] = [
  "FACEBOOK_PAGE",
  "INSTAGRAM_PAGE",
  "INSTAGRAM_ACCOUNT",
  "TELEGRAM_BOT",
  "WHATSAPP_BUSINESS",
  "WEBSITE_WIDGET",
];

/** Shown in the channel picker as "Coming soon". */
export const SOURCE_SOON_ACCOUNT_TYPES: AccountType[] = ["ZALO_PAGE"];

export const SOURCE_STATUS_COLOR = {
  ACTIVE: "green",
  STOPPED: "grey",
} as const;
