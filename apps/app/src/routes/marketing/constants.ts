import type { MarketingOverviewTodoDto } from "@/hooks/api/marketing-overview";
import type { JourneyStage, StageKey } from "./types";

/** The journey stages, in order. */
export const JOURNEY_STAGES: JourneyStage[] = [
  "NEW",
  "INTERESTED",
  "ASKED_PRICE",
  "BOUGHT_ONCE",
  "BOUGHT_REPEAT",
];

export type StageTone = "blue" | "purple" | "orange" | "green" | "grey";

/** Each stage's colour, shared by its icon and its tag. */
export const STAGE_TONE: Record<StageKey, StageTone> = {
  NEW: "blue",
  INTERESTED: "purple",
  ASKED_PRICE: "orange",
  BOUGHT_ONCE: "green",
  BOUGHT_REPEAT: "green",
  DORMANT: "grey",
};

/** The icon takes the stage colour; its box stays the plain avatar. */
export const STAGE_ICON_CLASS: Record<StageTone, string> = {
  blue: "text-ui-tag-blue-icon",
  purple: "text-ui-tag-purple-icon",
  orange: "text-ui-tag-orange-icon",
  green: "text-ui-tag-green-icon",
  grey: "text-ui-tag-neutral-icon",
};

/**
 * The stage each "Việc nên làm" row sits under. Lâu không nhắn is not who
 * the win-back row picks, so that row shows the label without a count.
 */
export const TODO_STAGE: Record<MarketingOverviewTodoDto["key"], StageKey> = {
  NEW: "NEW",
  INTERESTED: "INTERESTED",
  ASKED_PRICE: "ASKED_PRICE",
  CROSS_SELL: "BOUGHT_ONCE",
  REPURCHASE: "BOUGHT_REPEAT",
  WIN_BACK: "DORMANT",
};

/** Giọng văn the AI writes in. */
export const MARKETING_DRAFT_TONES = ["FRIENDLY", "POLITE", "PLAYFUL"] as const;

/** Dài hơn, Ngắn hơn: rewrites that keep the tone. */
export const MARKETING_DRAFT_LENGTHS = ["LONGER", "SHORTER"] as const;

/** Tự gửi mỗi ngày first: it is the one we recommend. */
export const MARKETING_SEND_MODES = ["AUTO", "ONCE"] as const;

export const MARKETING_SEND_TEXT_MAX = 1000;

/** Customers a send can leave out by hand, and rows per page in their list. */
export const MARKETING_SEND_EXCLUDED_MAX = 1000;
export const MARKETING_SEND_CUSTOMERS_PAGE_SIZE = 10;

/** The API's bounds for Cài đặt gửi tin. */
export const MARKETING_SETTINGS_LIMITS = {
  maxPer30Days: 10,
  restAfter: 10,
  restDays: 365,
  stopKeywords: 10,
};

/** Hours a shop picks send times from, "HH:00". */
export const MARKETING_SEND_HOURS = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`,
);
