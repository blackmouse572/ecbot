import {
  CHANNELS,
  channelOf,
  type Channel,
} from "@/components/platform-icon/channel-catalog";
import type { MarketingOverviewFunnelDto } from "@/hooks/api/marketing-overview";
import { ROUTES } from "@/routes/constants";
import type { JourneyStage, StageKey } from "./types";

/** The Customers list filtered to one stage, or to Lâu không nhắn. */
export const customersAtStage = (workspaceSlug: string, stage: StageKey) =>
  `/${workspaceSlug}/${ROUTES.Customers}?${
    stage === "DORMANT" ? "dormant=true" : `stage=${stage}`
  }`;

/**
 * One funnel band per channel, in the catalog's order. A page and an account
 * of the same platform share a band, so their counts add up per stage.
 */
export const funnelSeries = (
  funnel: MarketingOverviewFunnelDto[],
  stages: JourneyStage[],
): { channel: Channel; counts: number[] }[] =>
  CHANNELS.flatMap((channel) => {
    const rows = funnel.filter((row) => channelOf(row.platform) === channel);
    if (rows.length === 0) return [];
    return [
      {
        channel,
        counts: stages.map((stage) =>
          rows.reduce(
            (sum, row) =>
              sum + (row.stages.find((s) => s.stage === stage)?.count ?? 0),
            0,
          ),
        ),
      },
    ];
  });
