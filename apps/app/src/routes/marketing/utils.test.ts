import { describe, expect, it } from "vitest";
import type { MarketingOverviewFunnelDto } from "@/hooks/api/marketing-overview";
import { JOURNEY_STAGES } from "./constants";
import { customersAtStage, funnelSeries } from "./utils";

const row = (
  platform: MarketingOverviewFunnelDto["platform"],
  counts: number[],
): MarketingOverviewFunnelDto => ({
  platform,
  // The API sends stages in order; reversed to prove the lookup is by key.
  stages: JOURNEY_STAGES.map((stage, i) => ({
    stage,
    count: counts[i],
  })).reverse(),
});

describe("funnelSeries", () => {
  it("adds a page and an account of one platform into one channel, in the catalog's order", () => {
    const series = funnelSeries(
      [
        row("ZALO_PAGE", [4, 2, 1, 0, 0]),
        row("FACEBOOK_PAGE", [10, 6, 3, 2, 1]),
        row("FACEBOOK_ACCOUNT", [5, 1, 1, 1, 0]),
      ],
      JOURNEY_STAGES,
    );

    expect(series.map((s) => [s.channel.key, s.counts])).toEqual([
      ["facebook", [15, 7, 4, 3, 1]],
      ["zalo", [4, 2, 1, 0, 0]],
    ]);
  });

  it("leaves out channels nobody came from", () => {
    expect(funnelSeries([], ["NEW"])).toEqual([]);
  });
});

describe("customersAtStage", () => {
  it("filters by stage, or by Lâu không nhắn", () => {
    expect(customersAtStage("lumi", "ASKED_PRICE")).toBe(
      "/lumi/customers?stage=ASKED_PRICE",
    );
    expect(customersAtStage("lumi", "DORMANT")).toBe(
      "/lumi/customers?dormant=true",
    );
  });
});
