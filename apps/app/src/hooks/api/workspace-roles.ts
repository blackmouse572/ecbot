import { queryKeysFactory } from "@/libs/query-factory";
import {
  roleWorkspaceControllerCreateV1,
  roleWorkspaceControllerGetV1,
  roleWorkspaceControllerListV1,
  type ResponsePagingDto,
  type RoleCreateWorkspaceRequestDto,
  type RoleGetResponseDto,
  type RoleListResponseDto,
  type RoleWorkspaceControllerListV1Data,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useWorkspaceParams } from "../use-workspace-params";

export const workspaceRoleQueryKey = queryKeysFactory("workspace-roles");

export const workspaceRoleListQueryOptions = (
  workspace: string,
  query?: RoleWorkspaceControllerListV1Data["query"],
) =>
  queryOptions({
    queryKey: workspaceRoleQueryKey.list({
      workspace,
      ...query,
    }),
    queryFn: async () => {
      const response = await roleWorkspaceControllerListV1({
        query,
        path: { workspace: workspace },
      });
      return response?.data as unknown as Omit<ResponsePagingDto, "data"> & {
        data: RoleListResponseDto[];
      };
    },
  });

export const workspaceRoleDetailQueryOptions = (
  workspace: string,
  roleId: string,
) =>
  queryOptions({
    queryKey: workspaceRoleQueryKey.detail(roleId),
    queryFn: async () => {
      const response = await roleWorkspaceControllerGetV1({
        path: { workspace: workspace, role: roleId },
      });
      return response?.data;
    },
  });

export function useWorkspaceRoles(
  query?: RoleWorkspaceControllerListV1Data["query"],
  options?: Partial<ReturnType<typeof workspaceRoleListQueryOptions>>,
) {
  const { workspaceSlug } = useWorkspaceParams();
  const { data, ...rest } = useQuery({
    ...workspaceRoleListQueryOptions(workspaceSlug, query),
    ...options,
  });

  return {
    roles: data?.data || [],
    totals: data?._metadata?.pagination?.total,
    ...rest,
  };
}

export function useWorkspaceRole(
  roleId: string,
  options?: Partial<ReturnType<typeof workspaceRoleDetailQueryOptions>>,
) {
  const { workspaceSlug } = useWorkspaceParams();
  const { data, ...props } = useQuery({
    ...workspaceRoleDetailQueryOptions(workspaceSlug, roleId),
    ...options,
  });

  return {
    role: (data as A)?.data as RoleGetResponseDto,
    data,
    ...props,
  };
}

export function useCreateWorkspaceRole() {
  const { workspaceSlug } = useWorkspaceParams();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoleCreateWorkspaceRequestDto) =>
      roleWorkspaceControllerCreateV1({
        body: data,
        path: { workspace: workspaceSlug },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceRoleQueryKey.lists(),
      });
    },
    onError: (error) => {
      console.error("Failed to create role:", error);
    },
  });
}
