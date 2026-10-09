import type { AuthLoginMfaChallengeResponseDto } from "@/types/mfa";
import {
  authMfaSharedControllerDisableV1,
  authPublicControllerLoginWithMfaV1,
  client,
  type AuthLoginMfaRequestDto,
  type AuthLoginResponseDto,
  type AuthMfaDisableRequestDto,
  type AuthMfaEnableResponseDto,
  type AuthMfaSetupResponseDto,
} from "@repo/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKeys } from "./users";

export type {
  AuthLoginMfaChallengeResponseDto,
  AuthMfaEnableResponseDto,
  AuthMfaSetupResponseDto,
};

export const isMfaChallenge = (
  data: AuthLoginResponseDto | AuthLoginMfaChallengeResponseDto,
): data is AuthLoginMfaChallengeResponseDto =>
  "mfaRequired" in data && data.mfaRequired === true;

// Setup, enable and recovery-codes take bodies @repo/client does not have
// yet; switch to the generated functions after `pnpm generate:client`.
const postMfa = <T>(path: string, body: object): Promise<T> =>
  client
    .post({
      url: `/api/v1/shared/auth/mfa/${path}`,
      body,
      throwOnError: true,
    })
    .then((res) => (res.data as { data: T }).data);

export const useLoginWithMfa = () =>
  useMutation({
    mutationFn: (body: AuthLoginMfaRequestDto) =>
      authPublicControllerLoginWithMfaV1({
        body,
        throwOnError: true,
        // The response sets the refresh-token cookie.
        withCredentials: true,
      }).then((res) => res.data.data as AuthLoginResponseDto),
  });

export const useMfaSetup = () =>
  useMutation({
    mutationFn: (password: string) =>
      postMfa<AuthMfaSetupResponseDto>("setup", { password }),
  });

const useInvalidateMe = () => {
  const queryClient = useQueryClient();
  // Prefix match, so the profile is refetched with or without a workspace.
  return () =>
    queryClient.invalidateQueries({
      queryKey: usersQueryKeys.me().slice(0, 2),
    });
};

export const useMfaEnable = () => {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (body: { password: string; code: string }) =>
      postMfa<AuthMfaEnableResponseDto>("enable", body),
    onSuccess: invalidateMe,
  });
};

export const useMfaRegenerateRecoveryCodes = () =>
  useMutation({
    mutationFn: (body: AuthMfaDisableRequestDto) =>
      postMfa<AuthMfaEnableResponseDto>("recovery-codes", body),
  });

export const useMfaDisable = () => {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: async (body: AuthMfaDisableRequestDto) => {
      await authMfaSharedControllerDisableV1({ body, throwOnError: true });
    },
    onSuccess: invalidateMe,
  });
};
