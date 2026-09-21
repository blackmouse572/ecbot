import { queryKeysFactory } from "@/libs/query-factory";
import {
  invitationWorkspaceControllerGetInvitationsV1,
  invitationWorkspaceControllerRevokeInvitationV1,
  invitationWorkspaceControllerUpdateInvitationRoleV1,
  type InvitationListResponseDto,
  type InvitationWorkspaceControllerGetInvitationsV1Data,
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
import { workspaceRoleQueryKey } from "./workspace-roles";

export const invitationQueryKey = queryKeysFactory("invitations");

export const invitationListQueryOptions = (
  workspace: string,
  query?: Record<string, A>,
) =>
  queryOptions({
    queryKey: invitationQueryKey.list(query),
    queryFn: async () => {
      const response = await invitationWorkspaceControllerGetInvitationsV1({
        query,
        path: { workspace: workspace },
      });
      return response?.data as unknown as Omit<ResponsePagingDto, "data"> & {
        data: InvitationListResponseDto[];
      };
    },
  });

export function useInvitations(
  query?: InvitationWorkspaceControllerGetInvitationsV1Data["query"],

  options?: Partial<ReturnType<typeof invitationListQueryOptions>>,
) {
  const { workspaceSlug } = useWorkspaceParams();
  const { data, ...rest } = useQuery({
    ...invitationListQueryOptions(workspaceSlug, query),
    ...options,
  });

  return {
    invitations: data?.data,
    count: data?._metadata?.pagination?.total,
    data,
    ...rest,
  };
}

const invalidateInvitations = (
  queryClient: ReturnType<typeof useQueryClient>,
) =>
  queryClient.invalidateQueries({
    queryKey: invitationQueryKey.all,
    exact: false,
  });

export function useUpdateInvitationRole(
  option?: MutationOptions<A, A, { id: string; role: string }>,
) {
  const { workspaceSlug } = useWorkspaceParams(),
    queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      invitationWorkspaceControllerUpdateInvitationRoleV1({
        path: { workspace: workspaceSlug, invitation: id },
        body: { roleId: role },
      }),
    onSuccess: () => invalidateInvitations(queryClient),
    ...option,
  });
}

export function useRevokeInvitation(options?: MutationOptions<A, A, string>) {
  const { workspaceSlug } = useWorkspaceParams(),
    queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invitationWorkspaceControllerRevokeInvitationV1({
        path: { workspace: workspaceSlug, invitation: id },
      }),
    onSuccess: (d, v, c) => {
      invalidateInvitations(queryClient);
      queryClient.invalidateQueries({
        queryKey: workspaceRoleQueryKey.all,
        exact: false,
      });
      options?.onSuccess?.(d, v, c);
    },
    ...options,
  });
}
