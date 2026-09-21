import { queryKeysFactory } from "@/libs/query-factory";
import {
  requestControllerApproveRequestV1,
  requestControllerGetRequestsV1,
  type RequestListResponseDto,
  type ResponsePagingDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type MutationOptions,
} from "@tanstack/react-query";
import { useWorkspaceParams } from "../use-workspace-params";

export const joinRequestQueryKey = queryKeysFactory("join-requests");

// workspaceId accepts a slug — WorkspaceGuard resolves via findOneByIdOrSlug.
export const joinRequestListQueryOptions = (workspaceId: string) =>
  queryOptions({
    // Keyed by workspace — the cached rows are workspace-scoped PII, so a
    // shared key would render workspace A's requesters while B refetches.
    queryKey: joinRequestQueryKey.list(workspaceId),
    queryFn: async () => {
      const response = await requestControllerGetRequestsV1({
        path: { workspaceId },
      });
      return response?.data as unknown as Omit<ResponsePagingDto, "data"> & {
        data: RequestListResponseDto[];
      };
    },
  });

export function useJoinRequests(
  options?: Partial<ReturnType<typeof joinRequestListQueryOptions>>,
) {
  const { workspaceSlug } = useWorkspaceParams();
  const { data, ...rest } = useQuery({
    ...joinRequestListQueryOptions(workspaceSlug),
    ...options,
  });

  return {
    joinRequests: data?.data,
    count: data?._metadata?.pagination?.total,
    data,
    ...rest,
  };
}

export function useApproveJoinRequest(options?: MutationOptions<A, A, string>) {
  const { workspaceSlug } = useWorkspaceParams();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: string) => {
      return requestControllerApproveRequestV1({
        path: { workspaceId: workspaceSlug, id },
      });
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: joinRequestQueryKey.all,
        exact: false,
      });
      options?.onSuccess?.(...args);
    },
  });
}
