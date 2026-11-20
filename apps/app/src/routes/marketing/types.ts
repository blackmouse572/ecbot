import type { MarketingOverviewStageDto } from "@/hooks/api/marketing-overview";

export type JourneyStage = MarketingOverviewStageDto["stage"];

/** A journey stage, or "Lâu không nhắn", which is computed and not a stage. */
export type StageKey = JourneyStage | "DORMANT";
