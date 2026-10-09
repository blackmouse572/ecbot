import { queryKeysFactory } from "@/libs/query-factory";
import {
  exportUserControllerMeV1,
  userSharedControllerGetUserProfileV1,
  userSharedControllerProfileV1,
  userSharedControllerUpdateNotificationsV1,
  userUserControllerDeleteV1,
  workspaceControllerProfileV1,
  type UserProfileResponseDto,
  type UserSharedControllerProfileV1Response,
  type WorkspaceGetProfileResponseDto,
} from "@repo/client";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useLogout } from "./auth";

const USERS_QUERY_KEY = "users" as const;
export const usersQueryKeys = {
  ...queryKeysFactory(USERS_QUERY_KEY),
  me: (workspace?: string) => [USERS_QUERY_KEY, "me", workspace],
};

export const meQueryOptions = (workspace?: string) =>
  queryOptions({
    queryKey: usersQueryKeys.me(workspace),
    queryFn: () =>
      workspace
        ? workspaceControllerProfileV1({
            path: { workspace },
          })
        : userSharedControllerProfileV1(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
export function useMe() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data, ...rest } = useQuery(meQueryOptions(workspaceSlug));
  const user = (data?.data as unknown as UserSharedControllerProfileV1Response)
    ?.data as UserProfileResponseDto | WorkspaceGetProfileResponseDto;

  return {
    ...rest,
    data,
    user,
  };
}

/** Saves the user's email-notification choices (handover emails). */
export function useUpdateNotificationSettings() {
  const client = useQueryClient();
  const { mutateAsync, ...rest } = useMutation({
    mutationFn: async (body: { handoffEmails: boolean }) => {
      const response = await userSharedControllerUpdateNotificationsV1({
        body,
      });
      if (response.error) throw response.error;
      return true;
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: [USERS_QUERY_KEY, "me"] }),
  });

  return { updateNotifications: mutateAsync, ...rest };
}

export function useDeleteProfile() {
  const client = useQueryClient();
  const go = useNavigate();
  const logout = useLogout();

  const { mutateAsync: deleteProfile, ...rest } = useMutation({
    mutationKey: usersQueryKeys.me(),
    mutationFn: () => userUserControllerDeleteV1(),
    onSuccess: () => {
      client.clear();
      logout();
      go("/login");
    },
  });

  return {
    deleteProfile,
    ...rest,
  };
}

const exportMyData = () =>
  exportUserControllerMeV1({ throwOnError: true }).then((res) => res.data.data);

/** Right of access: downloads everything we hold about the signed-in user. */
export function useExportMyData() {
  return useMutation({ mutationFn: exportMyData });
}

export const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: usersQueryKeys.detail(userId),
    queryFn: () =>
      userSharedControllerGetUserProfileV1({ path: { user: userId } }),
  });

export function useUser(userId: string) {
  const { data, ...rest } = useQuery(userQueryOptions(userId));

  const user = (data?.data as unknown as UserSharedControllerProfileV1Response)
    ?.data;

  return {
    ...rest,
    user,
  };
}
