import queryClient from "@/libs/query-client";
import { queryKeysFactory } from "@/libs/query-factory";
import {
  featureFlagWorkspaceControllerGetV1,
  type FeatureFlagGetResponseDto,
} from "@repo/client";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export type { FeatureFlagGetResponseDto };
export type FeatureFlagKey = keyof FeatureFlagGetResponseDto;

export const featureFlagQueryKeys = queryKeysFactory("feature-flags");

const FLAGS_OFF: FeatureFlagGetResponseDto = {
  orders: false,
  customerSources: false,
  marketing: false,
};

/**
 * The flags query. It retries and refetches on focus and reconnect, so one
 * failed request does not hide an enabled feature for the whole session.
 */
export const featureFlagsQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: featureFlagQueryKeys.detail(slug),
    staleTime: 60_000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: () =>
      featureFlagWorkspaceControllerGetV1({
        path: { workspace: slug },
      }).then((res) => res.data?.data ?? FLAGS_OFF),
  });

/**
 * Loads the flags before a route renders. Off after a failed load, like the
 * API, which 404s a flagged endpoint when it cannot read the flag.
 */
export const loadFeatureFlags = (
  slug: string | undefined,
): Promise<FeatureFlagGetResponseDto> =>
  slug
    ? queryClient
        .ensureQueryData(featureFlagsQueryOptions(slug))
        .catch(() => FLAGS_OFF)
    : Promise.resolve(FLAGS_OFF);

/** A flag from the cache, for code outside React such as a route breadcrumb. */
export const isFeatureOn = (slug: string | undefined, flag: FeatureFlagKey) =>
  !!slug &&
  !!queryClient.getQueryData(featureFlagsQueryOptions(slug).queryKey)?.[flag];

/**
 * The workspace's feature flags (Đơn hàng, Nguồn khách, Tiếp thị). Every flag reads as
 * off until the API answers, so a hidden feature never flashes into view.
 */
export const useFeatureFlags = () => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, isLoading, isError } = useQuery({
    ...featureFlagsQueryOptions(slug ?? ""),
    enabled: !!slug,
  });

  return { flags: data ?? FLAGS_OFF, isLoading: isLoading || !slug, isError };
};
