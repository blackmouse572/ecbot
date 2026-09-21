import { queryKeysFactory } from "@/libs/query-factory";
import {
  navCountWorkspaceControllerGetV1,
  type NavCountGetResponseDto,
} from "@repo/client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const NAV_COUNT_QUERY_KEY = "nav-counts" as const;
export const navCountQueryKeys = queryKeysFactory(NAV_COUNT_QUERY_KEY);

const NAV_COUNT_REFETCH_MS = 30_000;

const EMPTY_COUNTS: NavCountGetResponseDto = {
  pendingSuggestions: 0,
  accountsNeedingAttention: 0,
  toolsNeedingAttention: 0,
};

/**
 * Workspace "needs attention" counts backing the nav badges. One shared query
 * (30s poll) feeds all three badges. Ability-awareness is handled by the nav
 * items themselves — each badge lives inside an ability-gated `<Can>` item.
 */
export const useNavCounts = (): NavCountGetResponseDto => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data } = useQuery({
    queryKey: navCountQueryKeys.detail(slug ?? ""),
    enabled: !!slug,
    // Keep polling through transient errors so the badge self-recovers.
    refetchInterval: NAV_COUNT_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: () =>
      navCountWorkspaceControllerGetV1({
        path: { workspace: slug! },
      }).then((res) => res.data?.data ?? null),
  });

  return data ?? EMPTY_COUNTS;
};
