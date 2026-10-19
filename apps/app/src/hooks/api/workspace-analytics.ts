import { queryKeysFactory } from "@/libs/query-factory";
import type {
  AnalyticsRange,
  AnalyticsTab,
  WorkspaceAnalytics,
} from "@/types/workspace-analytics";
import {
  analyticsWorkspaceControllerBotV1,
  analyticsWorkspaceControllerConversionV1,
  analyticsWorkspaceControllerCustomersV1,
  analyticsWorkspaceControllerMarketingV1,
} from "@repo/client";
import { useQueries } from "@tanstack/react-query";
import { useWorkspaceParams } from "../use-workspace-params";

export type * from "@/types/workspace-analytics";

export const ANALYTICS_RANGES: readonly AnalyticsRange[] = ["7d", "30d", "90d"];

export const workspaceAnalyticsKeys = queryKeysFactory("workspace-analytics");

type Section = keyof WorkspaceAnalytics;

type SectionArgs = {
  path: { workspace: string };
  query: { range: AnalyticsRange; timezone: string };
};

// Each tab has its own endpoint, guarded by the abilities its numbers need.
const FETCH: {
  [K in Section]: (
    args: SectionArgs,
  ) => Promise<{ data?: { data?: WorkspaceAnalytics[K] } }>;
} = {
  conversion: analyticsWorkspaceControllerConversionV1,
  marketing: analyticsWorkspaceControllerMarketingV1,
  bot: analyticsWorkspaceControllerBotV1,
  customers: analyticsWorkspaceControllerCustomersV1,
};
const SECTIONS = Object.keys(FETCH) as Section[];

/**
 * The dashboard numbers for one range, one query per tab the member may see.
 * The server caches each section for 10 minutes; days follow this browser's
 * timezone.
 */
export const useWorkspaceAnalytics = (
  range: AnalyticsRange,
  tabs: AnalyticsTab[],
) => {
  const { workspaceSlug } = useWorkspaceParams();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sections = SECTIONS.filter((section) => tabs.includes(section));

  const results = useQueries({
    queries: sections.map((section) => ({
      queryKey: workspaceAnalyticsKeys.detail(section, {
        workspaceSlug,
        range,
        timezone,
      }),
      queryFn: () =>
        FETCH[section]({
          path: { workspace: workspaceSlug! },
          query: { range, timezone },
        }).then((res) => res.data?.data ?? null),
      enabled: !!workspaceSlug,
      staleTime: 10 * 60 * 1000,
    })),
  });

  const data: WorkspaceAnalytics = Object.fromEntries(
    sections.map((section, i) => [section, results[i].data ?? undefined]),
  );
  const generatedAt = results
    .map((r) => r.data?.generatedAt)
    .filter((at): at is string => !!at)
    .sort()[0];

  return {
    data,
    generatedAt,
    isLoading: results.some((r) => r.isLoading),
    isFetching: results.some((r) => r.isFetching),
    isError: results.some((r) => r.isError),
    refetch: () => Promise.all(results.map((r) => r.refetch())),
  };
};
