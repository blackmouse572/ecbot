import { queryKeysFactory } from "@/libs/query-factory";
import {
  tokenUsageWorkspaceControllerByChatbotV1,
  tokenUsageWorkspaceControllerExportV1,
  tokenUsageWorkspaceControllerByPlatformV1,
  tokenUsageWorkspaceControllerSettingsV1,
  tokenUsageWorkspaceControllerSummaryV1,
  tokenUsageWorkspaceControllerTrendV1,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const tokenUsageQueryKey = queryKeysFactory("token-usage");

/** Date range + dimension filters every usage endpoint accepts. */
export interface TokenUsageWindow {
  from?: string;
  to?: string;
  chatbotId?: string;
  platform?: string;
}

/**
 * The API withholds absolute token counts in production and attaches them under
 * `debug` everywhere else, so `tokens`/`debug` being undefined is the normal
 * production shape, not missing data.
 */
export interface TokenUsageSummary {
  planName: string;
  status: string;
  usedPercent: number;
  periodEnd: string;
  hasCredit: boolean;
  lowBalanceThreshold?: number;
  debug?: {
    tokenQuota: number;
    tokenUsedInPeriod: number;
    tokenCreditBalance: number;
  };
}

export interface TokenUsageTrendPoint {
  day: string;
  percentOfQuota: number;
  messages: number;
  tokens?: number;
}

export interface TokenUsageBreakdownRow {
  label: string;
  id?: string;
  sharePercent: number;
  messages: number;
  tokens?: number;
}

export function useTokenUsageSummary() {
  const { workspace } = useWorkspace();
  const { data, ...rest } = useQuery({
    queryKey: tokenUsageQueryKey.detail("summary"),
    queryFn: async () => {
      const response = await tokenUsageWorkspaceControllerSummaryV1({
        path: { workspace: workspace!.slug },
      });
      return (response?.data as A)?.data as TokenUsageSummary;
    },
    enabled: !!workspace?.slug,
  });

  return { summary: data, ...rest };
}

export function useTokenUsageTrend(window?: TokenUsageWindow) {
  const { workspace } = useWorkspace();
  const { data, ...rest } = useQuery({
    queryKey: tokenUsageQueryKey.list({ scope: "trend", ...window }),
    queryFn: async () => {
      const response = await tokenUsageWorkspaceControllerTrendV1({
        path: { workspace: workspace!.slug },
        query: window as A,
      });
      return (response?.data as A)?.data as { points: TokenUsageTrendPoint[] };
    },
    enabled: !!workspace?.slug,
  });

  return { points: data?.points ?? [], ...rest };
}

export function useTokenUsageByChatbot(window?: TokenUsageWindow) {
  const { workspace } = useWorkspace();
  const { data, ...rest } = useQuery({
    queryKey: tokenUsageQueryKey.list({ scope: "by-chatbot", ...window }),
    queryFn: async () => {
      const response = await tokenUsageWorkspaceControllerByChatbotV1({
        path: { workspace: workspace!.slug },
        query: window as A,
      });
      return (response?.data as A)?.data as { rows: TokenUsageBreakdownRow[] };
    },
    enabled: !!workspace?.slug,
  });

  return { rows: data?.rows ?? [], ...rest };
}

export function useTokenUsageByPlatform(window?: TokenUsageWindow) {
  const { workspace } = useWorkspace();
  const { data, ...rest } = useQuery({
    queryKey: tokenUsageQueryKey.list({ scope: "by-platform", ...window }),
    queryFn: async () => {
      const response = await tokenUsageWorkspaceControllerByPlatformV1({
        path: { workspace: workspace!.slug },
        query: window as A,
      });
      return (response?.data as A)?.data as { rows: TokenUsageBreakdownRow[] };
    },
    enabled: !!workspace?.slug,
  });

  return { rows: data?.rows ?? [], ...rest };
}

export function useUpdateTokenUsageSettings() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { lowBalanceThreshold?: number }) =>
      tokenUsageWorkspaceControllerSettingsV1({
        path: { workspace: workspace!.slug },
        body: body as A,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tokenUsageQueryKey.all }),
  });
}

/**
 * Download the current filter set as CSV.
 *
 * Goes through the generated client so the request carries the same auth as
 * every other call — a plain `<a href>` would hit the endpoint unauthenticated.
 * The response is turned into an object URL and clicked, then revoked.
 */
export function useExportTokenUsage() {
  const { workspace } = useWorkspace();

  return useMutation({
    mutationFn: async (window?: TokenUsageWindow) => {
      const response = await tokenUsageWorkspaceControllerExportV1({
        path: { workspace: workspace!.slug },
        query: window as A,
      });

      const blob = new Blob([response.data as unknown as BlobPart], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `token-usage-${workspace!.slug}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
}
