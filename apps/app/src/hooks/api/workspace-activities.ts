import { queryKeysFactory } from "@/libs/query-factory";
import {
  activityWorkspaceControllerListV1,
  type ActivityListResponseDto,
  type ActivitySharedControllerListV1Response,
  type ActivityWorkspaceControllerListV1Data,
} from "@repo/client";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useWorkspaceParams } from "../use-workspace-params";

export const workspaceActivityKeys = queryKeysFactory("workspace-activity");

export const workspaceActivityListQueryOptions = (
  payload?: Record<string, A>,
  options?: Record<string, A>,
) =>
  infiniteQueryOptions({
    queryKey: workspaceActivityKeys.list({
      workspaceId: payload?.workspaceId ?? "",
      ...payload,
    }),
    queryFn: async ({ signal, pageParam }) => {
      const { data } = await activityWorkspaceControllerListV1({
        path: { workspace: payload?.workspaceId ?? "" },
        query: {
          orderBy: "createdAt",
          orderDirection: "desc",
          ...payload,
          page: pageParam.page,
        },
        signal,
      });
      return data as unknown as ActivitySharedControllerListV1Response;
    },
    initialPageParam: {
      page: options?.page ?? 1,
    },
    getNextPageParam: (data) => {
      const page = data?._metadata?.pagination?.page;
      const totalPage = data?._metadata?.pagination?.totalPage;
      if (page && totalPage && page < totalPage) {
        return {
          page: page + 1,
        };
      }
      return undefined;
    },
  });

export const useWorkspaceActivities = (
  payload?: ActivityWorkspaceControllerListV1Data["query"],
  options?: Partial<ReturnType<typeof workspaceActivityListQueryOptions>>,
) => {
  const { workspaceSlug } = useWorkspaceParams();
  const { data, ...rest } = useInfiniteQuery({
    ...workspaceActivityListQueryOptions({
      ...payload,
      workspaceId: workspaceSlug,
    }),
    ...options,
  });

  const activities = useMemo(() => {
    return data?.pages?.flatMap(
      (page) => page.data,
    ) as unknown as ActivityListResponseDto[];
  }, [data?.pages]);

  return {
    activities,
    count: data?.pages?.[0]?._metadata?.pagination?.total ?? 0,
    ...rest,
  };
};
