import {
  authMfaSharedControllerDisableV1,
  authMfaSharedControllerEnableV1,
  authMfaSharedControllerRegenerateRecoveryCodesV1,
  authMfaSharedControllerSetupV1,
  authPublicControllerLoginWithMfaV1,
  type AuthLoginMfaChallengeResponseDto,
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
      authMfaSharedControllerSetupV1({
        body: { password },
        throwOnError: true,
      }).then((res) => res.data.data as AuthMfaSetupResponseDto),
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
      authMfaSharedControllerEnableV1({ body, throwOnError: true }).then(
        (res) => res.data.data as AuthMfaEnableResponseDto,
      ),
    onSuccess: invalidateMe,
  });
};

export const useMfaRegenerateRecoveryCodes = () =>
  useMutation({
    mutationFn: (body: AuthMfaDisableRequestDto) =>
      authMfaSharedControllerRegenerateRecoveryCodesV1({
        body,
        throwOnError: true,
      }).then((res) => res.data.data as AuthMfaEnableResponseDto),
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
