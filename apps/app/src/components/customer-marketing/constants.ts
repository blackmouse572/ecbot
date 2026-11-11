import type { CustomerPermission, CustomerStage } from "./types";

/** Journey stages in the order a customer moves through them. */
export const CUSTOMER_STAGES: CustomerStage[] = [
  "NEW",
  "INTERESTED",
  "ASKED_PRICE",
  "BOUGHT_ONCE",
  "BOUGHT_REPEAT",
];

export const CUSTOMER_PERMISSIONS: CustomerPermission[] = [
  "PENDING",
  "GRANTED",
  "PAUSED",
  "STOPPED",
];

// Badge colour per stage. Never red: a stage is not a problem. Lâu không nhắn
// is grey.
export const STAGE_BADGE_COLOR: Record<
  CustomerStage,
  "blue" | "purple" | "orange" | "green"
> = {
  NEW: "blue",
  INTERESTED: "purple",
  ASKED_PRICE: "orange",
  BOUGHT_ONCE: "green",
  BOUGHT_REPEAT: "green",
};

// Reasons the API stores as codes (rules, merges); any other reason is free
// text someone typed and is shown as written.
export const MARKETING_REASON_CODES = [
  "opt_out_keyword",
  "first_message",
  "customer_merge",
  "hostile",
  "order_confirmed",
  "tracked_link",
] as const;
