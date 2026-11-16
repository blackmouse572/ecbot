import { queryKeysFactory } from "@/libs/query-factory";
import {
  featureFlagWorkspaceControllerGetV1,
  type FeatureFlagGetResponseDto,
} from "@repo/client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export type { FeatureFlagGetResponseDto };
export type FeatureFlagKey = keyof FeatureFlagGetResponseDto;

export const featureFlagQueryKeys = queryKeysFactory("feature-flags");

const FLAGS_OFF: FeatureFlagGetResponseDto = {
  orders: false,
  customerSources: false,
};

/**
 * The workspace's feature flags (Đơn hàng, Nguồn khách). Every flag reads as
 * off until the API answers, so a hidden feature never flashes into view.
 */
export const useFeatureFlags = () => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, isLoading, isError } = useQuery({
    queryKey: featureFlagQueryKeys.detail(slug ?? ""),
    enabled: !!slug,
    staleTime: 60_000,
    queryFn: () =>
      featureFlagWorkspaceControllerGetV1({
        path: { workspace: slug! },
      }).then((res) => res.data?.data ?? FLAGS_OFF),
  });

  return { flags: data ?? FLAGS_OFF, isLoading: isLoading || !slug, isError };
};
