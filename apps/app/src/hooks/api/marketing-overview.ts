import type { AnalyticsRange } from "@/hooks/api/workspace-analytics";
import { queryKeysFactory } from "@/libs/query-factory";
import {
  marketingOverviewWorkspaceControllerGetV1,
  type MarketingOverviewResponseDto,
} from "@repo/client";
import { queryOptions, useQuery } from "@tanstack/react-query";

export type {
  MarketingOverviewFunnelDto,
  MarketingOverviewMoveDto,
  MarketingOverviewResponseDto,
  MarketingOverviewStageDto,
  MarketingOverviewTodoDto,
} from "@repo/client";

export const marketingOverviewKeys = queryKeysFactory("marketing-overview");

export const marketingOverviewQueryOptions = (
  slug: string,
  range: AnalyticsRange,
) =>
  queryOptions({
    queryKey: marketingOverviewKeys.detail(slug, { range }),
    queryFn: () =>
      marketingOverviewWorkspaceControllerGetV1({
        path: { workspace: slug },
        query: { range },
      })
        // SAFETY: the client throws on errors, and a 200 always carries data.
        .then((res) => res.data.data as MarketingOverviewResponseDto),
  });

/** Tổng quan tiếp thị: stages, funnel, moves, Việc nên làm, list health. */
export const useMarketingOverview = (slug: string, range: AnalyticsRange) => {
  const { data, isLoading, isError, error } = useQuery({
    ...marketingOverviewQueryOptions(slug, range),
    enabled: !!slug,
  });
  return { overview: data, isLoading, isError, error };
};
