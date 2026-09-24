import { queryKeysFactory } from "@/libs/query-factory";
import {
  workspaceControllerInviteMemberToWorkSpaceV1,
  workspaceMemberControllerAssignRoleToMemberV1,
  workspaceMemberControllerCreateJoinRequestByInvitationCodeV1,
  workspaceMemberControllerDeleteMemberV1,
  workspaceMemberControllerFindWorkspaceByInvitationCodeV1,
  workspaceMemberControllerGetAvailableInviteMembersV1,
  workspaceMemberControllerJoinWorkspaceV1,
  workspaceMemberControllerMemberDetailsV1,
  workspaceMemberControllerMembersV1,
  type ResponsePagingDto,
  type UserShortResponseDto,
  type WorkSpaceGetResponseDto,
  type WorkSpaceInviteMemberRequestDto,
  type WorkspaceMemberControllerFindWorkspaceByInvitationCodeV1Response,
  type WorkspaceMemberControllerGetAvailableInviteMembersV1Data,
  type WorkspaceMemberGetResponseDto,
  type WorkspaceMemberListResponseDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useWorkspaceParams } from "../use-workspace-params";
import { invitationQueryKey } from "./invitations";
import { usersQueryKeys } from "./users";

type QueryClientHandle = ReturnType<typeof useQueryClient>;

export const WORKSPACE_MEMBER_QUERY_KEY = "workspace-member" as const;
export const workspaceMemberKeys = queryKeysFactory(WORKSPACE_MEMBER_QUERY_KEY);

const fetchMemberPage = async (
  workspace: string,
  query?: Record<string, A>,
) => {
  const response = await workspaceMemberControllerMembersV1({
    query,
    path: { workspace },
  });
  const page = response?.data;

  return page as unknown as ResponsePagingDto;
};

export function workspaceMemberListQueryOptions(
  workspace: string,
  query?: Record<string, A>,
) {
  const listKey = workspaceMemberKeys.list(query);

  return queryOptions({
    queryKey: listKey,
    queryFn: () => fetchMemberPage(workspace, query),
  });
}

export const useWorkspaceMembers = (
  query?: Record<string, A>,
  options?: ReturnType<typeof workspaceMemberListQueryOptions>,
) => {
  const { workspaceSlug } = useWorkspaceParams(),
    baseConfig = workspaceMemberListQueryOptions(workspaceSlug, query);
  const queryConfig = Object.assign({}, baseConfig, options);
  const queryResult = useQuery(queryConfig);

  const result = {
    ...queryResult,
    count: queryResult.data?._metadata.pagination?.total,
    members: (queryResult.data?.data as WorkspaceMemberListResponseDto[]) || [],
  };

  return result;
};

/** Both the delete and invite mutations refresh the same two lists. */
const invalidateMemberDirectory = (queryClient: QueryClientHandle) => {
  [workspaceMemberKeys.all, usersQueryKeys.all].forEach((queryKey) =>
    queryClient.invalidateQueries({ queryKey, exact: false }),
  );
};

export const useDeleteWorkspaceMember = () => {
  const { workspaceSlug } = useWorkspaceParams(),
    queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (userId: string) =>
      workspaceMemberControllerDeleteMemberV1({
        path: { user: userId, workspace: workspaceSlug },
      }),
    onSuccess: () => invalidateMemberDirectory(queryClient),
  });

  return mutation;
};

const fetchInvitableUsers = async (
  workspace: string,
  query?: Record<string, A>,
) => {
  const response: A =
    await workspaceMemberControllerGetAvailableInviteMembersV1({
      path: { workspace },
      query,
    });
  return response.data as Omit<ResponsePagingDto, "data"> & {
    data: UserShortResponseDto[];
  };
};

export function invitableUsersQueryOptions(
  workspace: string,
  query?: Record<string, A>,
) {
  return queryOptions({
    queryKey: usersQueryKeys.list({ workspace, ...query }),
    queryFn: () => fetchInvitableUsers(workspace, query),
  });
}

export function useInvitableUsers(
  query?: WorkspaceMemberControllerGetAvailableInviteMembersV1Data["query"],
  options?: Partial<ReturnType<typeof invitableUsersQueryOptions>>,
) {
  const { workspaceSlug } = useWorkspaceParams(),
    { data: rawData, ...rest } = useQuery({
      ...invitableUsersQueryOptions(workspaceSlug, query),
      ...options,
    });

  return {
    data: rawData,
    users: rawData?.data,
    count: rawData?._metadata?.pagination?.total,
    ...rest,
  };
}

export function useInviteUser() {
  const { workspaceSlug } = useWorkspaceParams(),
    queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: WorkSpaceInviteMemberRequestDto) =>
      workspaceControllerInviteMemberToWorkSpaceV1({
        path: { workspace: workspaceSlug },
        body,
      }),
    onSuccess() {
      invalidateMemberDirectory(queryClient);
      queryClient.invalidateQueries({ queryKey: invitationQueryKey.all });
    },
  });

  return mutation;
}

/** The join endpoints surface their message on `error.response.data`. */
const rethrowJoinError = (error: A): never => {
  if (error.response?.data) {
    throw new Error(error.response.data.message);
  }
  throw error;
};

const resetAfterJoin = (client: QueryClientHandle, onSuccess?: () => void) => {
  onSuccess?.();
  client.cancelQueries();
  client.resetQueries();
};

export function useJoinWorkspace(options?: { onSuccess: () => void }) {
  const client = useQueryClient();

  const mutation = useMutation({
    mutationFn: (token: string) =>
      workspaceMemberControllerJoinWorkspaceV1({
        query: { token },
        throwOnError: true,
      })
        .then((response) => response.data)
        .catch(rethrowJoinError),
    onSuccess: () => resetAfterJoin(client, options?.onSuccess),
  });

  return mutation;
}

export function useJoinWorkspaceWithInvitationCode(options?: {
  onSuccess: () => void;
}) {
  const client = useQueryClient();

  const mutation = useMutation({
    mutationFn: (token: string) =>
      workspaceMemberControllerCreateJoinRequestByInvitationCodeV1({
        path: { invitationcode: token },
        body: { reason: "Join via invitation code" },
        throwOnError: true,
      })
        .then((response) => response.data)
        .catch(rethrowJoinError),
    onSuccess: () => resetAfterJoin(client, options?.onSuccess),
  });

  return mutation;
}

const fetchWorkspaceByInvitationCode = async (invitationCode: string) => {
  const res = await workspaceMemberControllerFindWorkspaceByInvitationCodeV1({
    path: { invitationcode: invitationCode },
  });
  return res.data as unknown as WorkspaceMemberControllerFindWorkspaceByInvitationCodeV1Response;
};

export function getWorkspaceByInvitationCodeQueryOption(
  invitationCode: string,
) {
  return queryOptions({
    queryKey: workspaceMemberKeys.detail(invitationCode),
    queryFn: () => fetchWorkspaceByInvitationCode(invitationCode),
  });
}

export function useGetWorkspaceByInvitationCode(invitationCode: string) {
  const { data: rawData, ...rest } = useQuery({
    ...getWorkspaceByInvitationCodeQueryOption(invitationCode),
    enabled: !!invitationCode,
  });

  return {
    workspace:
      (rawData?.data as unknown as WorkspaceMemberGetResponseDto) || undefined,
    ...rest,
  };
}

export function useGetWorkspaceByInvitationCodeMutation() {
  const { data: rawData, ...rest } = useMutation({
    mutationFn: fetchWorkspaceByInvitationCode,
  });

  return {
    workspace:
      (rawData?.data as unknown as WorkSpaceGetResponseDto) || undefined,
    ...rest,
  };
}

export function workspaceMemberQueryOptions(id: string, workspace: string) {
  return queryOptions({
    queryKey: workspaceMemberKeys.detail(id),
    queryFn: () =>
      workspaceMemberControllerMemberDetailsV1({
        path: { user: id, workspace },
      }),
  });
}

export function useWorkspaceMember(id: string) {
  const { workspaceSlug } = useWorkspaceParams(),
    { data: rawData, ...rest } = useQuery({
      ...workspaceMemberQueryOptions(id, workspaceSlug),
    });

  return {
    member: (rawData?.data as A)?.data as WorkspaceMemberGetResponseDto,
    ...rest,
  };
}

export function useAssignRoleWorkspaceMember(id: string) {
  const { workspaceSlug } = useWorkspaceParams(),
    queryClient = useQueryClient();
  const detailKey = workspaceMemberKeys.detail(id);

  return useMutation({
    mutationFn: (role: string) =>
      workspaceMemberControllerAssignRoleToMemberV1({
        path: { workspace: workspaceSlug, member: id, role },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey }),
  });
}
