import { queryKeysFactory } from "@/libs/query-factory";
import {
  trackedLinkWorkspaceControllerCreateChildV1,
  trackedLinkWorkspaceControllerCreateV1,
  trackedLinkWorkspaceControllerDeleteV1,
  trackedLinkWorkspaceControllerGetV1,
  trackedLinkWorkspaceControllerListV1,
  trackedLinkWorkspaceControllerUpdateV1,
  type TrackedLinkCreateChildRequestDto,
  type TrackedLinkCreateRequestDto,
  type TrackedLinkDetailResponseDto,
  type TrackedLinkGetResponseDto,
  type TrackedLinkUpdateRequestDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type {
  TrackedLinkCreateChildRequestDto,
  TrackedLinkCreateRequestDto,
  TrackedLinkDetailResponseDto,
  TrackedLinkGetResponseDto,
  TrackedLinkUpdateRequestDto,
};

export const TRACKED_LINK_QUERY_KEY = "tracked-links" as const;
export const trackedLinkQueryKeys = queryKeysFactory(TRACKED_LINK_QUERY_KEY);

export type TrackedLinkListParams = {
  search?: string;
  page?: number;
  perPage?: number;
  account?: string;
  status?: string;
};

export const trackedLinkListQueryOptions = (
  workspace: string,
  params?: TrackedLinkListParams,
) =>
  queryOptions({
    queryKey: trackedLinkQueryKeys.list({ workspace, ...params }),
    queryFn: () =>
      trackedLinkWorkspaceControllerListV1({
        path: { workspace },
        // SAFETY: account and status are list filters the API reads but the
        // generated query type leaves out.
        query: params as A,
      }).then((res) => res.data),
  });

export const trackedLinkDetailQueryOptions = (workspace: string, id: string) =>
  queryOptions({
    queryKey: trackedLinkQueryKeys.detail(id),
    queryFn: () =>
      trackedLinkWorkspaceControllerGetV1({
        path: { workspace, trackedLink: id },
      }).then((res) => res.data.data),
  });

export const useTrackedLinks = (
  workspace: string,
  params?: TrackedLinkListParams,
) => {
  const { data, ...rest } = useQuery({
    ...trackedLinkListQueryOptions(workspace, params),
    enabled: !!workspace,
  });

  return {
    ...rest,
    links: data?.data ?? [],
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useTrackedLink = (workspace: string, id: string) => {
  const { data, ...rest } = useQuery({
    ...trackedLinkDetailQueryOptions(workspace, id),
    enabled: !!workspace && !!id,
  });

  return { ...rest, link: data };
};

export const useCreateTrackedLink = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TrackedLinkCreateRequestDto) =>
      trackedLinkWorkspaceControllerCreateV1({
        path: { workspace },
        body,
      }).then((res) => res.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: trackedLinkQueryKeys.lists() }),
  });
};

export const useCreateTrackedLinkChild = (workspace: string, id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TrackedLinkCreateChildRequestDto) =>
      trackedLinkWorkspaceControllerCreateChildV1({
        path: { workspace, trackedLink: id },
        body,
      }).then((res) => res.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: trackedLinkQueryKeys.detail(id),
      }),
  });
};

export const useUpdateTrackedLink = (workspace: string, id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TrackedLinkUpdateRequestDto) =>
      trackedLinkWorkspaceControllerUpdateV1({
        path: { workspace, trackedLink: id },
        body,
      }).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackedLinkQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: trackedLinkQueryKeys.detail(id),
      });
    },
  });
};

export const useDeleteTrackedLink = (workspace: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      trackedLinkWorkspaceControllerDeleteV1({
        path: { workspace, trackedLink: id },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: trackedLinkQueryKeys.all }),
  });
};
