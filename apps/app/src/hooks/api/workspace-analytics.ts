import { queryKeysFactory } from "@/libs/query-factory";
import type { AnalyticsRange } from "@/types/workspace-analytics";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceParams } from "../use-workspace-params";
import { mockWorkspaceAnalytics } from "./workspace-analytics.mock";

export type * from "@/types/workspace-analytics";

export const ANALYTICS_RANGES: readonly AnalyticsRange[] = ["7d", "30d", "90d"];

export const workspaceAnalyticsKeys = queryKeysFactory("workspace-analytics");

/**
 * The dashboard numbers for one range. Sample data for now: the API endpoint
 * (cached 10 minutes server side) replaces the query function.
 */
export const useWorkspaceAnalytics = (range: AnalyticsRange) => {
  const { workspaceSlug } = useWorkspaceParams();
  return useQuery({
    queryKey: workspaceAnalyticsKeys.list({ workspaceSlug, range }),
    queryFn: async () => mockWorkspaceAnalytics(range),
    staleTime: 10 * 60 * 1000,
  });
};
