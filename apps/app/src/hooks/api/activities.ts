import { queryKeysFactory } from "@/libs/query-factory";
import {
  activitySharedControllerListV1,
  type ActivityListResponseDto,
  type ActivitySharedControllerListV1Data,
  type ActivitySharedControllerListV1Response,
} from "@repo/client";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const activityKeys = queryKeysFactory("activity");

export const activityListQueryOptions = (
  payload?: {
    workspaceId: string;
  } & ActivitySharedControllerListV1Data["query"],
) =>
  queryOptions({
    queryKey: activityKeys.list(payload),
    queryFn: async () => {
      return activitySharedControllerListV1({
        query: {
          orderBy: payload?.orderBy,
          orderDirection: payload?.orderDirection,
          page: payload?.page,
          perPage: payload?.perPage,
          search: payload?.search,
        },
      }).then(
        (res) => res.data as unknown as ActivitySharedControllerListV1Response,
      );
    },
  });

export const useActivities = (
  payload: Record<string, A> = {},
  options?: Partial<ReturnType<typeof activityListQueryOptions>>,
) => {
  const { data, ...rest } = useQuery({
    ...activityListQueryOptions({ workspaceId: "", ...payload }),
    ...options,
  });
  return {
    activities: data?.data as ActivityListResponseDto[],
    count: data?._metadata?.pagination?.total ?? 0,
    ...rest,
  };
};
