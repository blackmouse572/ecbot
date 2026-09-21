import { queryKeysFactory } from "@/libs/query-factory";
import {
  sessionSharedControllerListV1,
  sessionSharedControllerRevokeV1,
  type ResponsePagingDto,
  type SessionListResponseDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const SESSION_QUERY_KEY = "session" as const;

export const sessionQueryKeys = {
  ...queryKeysFactory<typeof SESSION_QUERY_KEY>(SESSION_QUERY_KEY),
};

export const sessionListQueryOptions = (query?: Record<string, A>) =>
  queryOptions({
    queryKey: sessionQueryKeys.list(query),
    queryFn: async () => {
      const response = await sessionSharedControllerListV1({ query });
      return response?.data as unknown as ResponsePagingDto;
    },
  });

export function useSessions(query?: Record<string, A>) {
  const { data, ...rest } = useQuery(sessionListQueryOptions(query));

  return {
    ...rest,
    sessions: (data?.data as SessionListResponseDto[]) ?? [],
    count: data?._metadata.pagination?.total ?? 0,
  };
}

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (session: string) =>
      sessionSharedControllerRevokeV1({ path: { session } }),
    // Refresh on settle (not just success): a revoke that fails because the
    // session already expired still means the list is stale and must reconcile.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists() });
    },
  });
};
