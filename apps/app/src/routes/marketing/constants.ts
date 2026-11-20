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
