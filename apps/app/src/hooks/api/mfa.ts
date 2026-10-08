import type {
  AuthLoginMfaChallengeResponseDto,
  AuthLoginMfaRequestDto,
  AuthMfaDisableRequestDto,
  AuthMfaEnableResponseDto,
  AuthMfaSetupResponseDto,
} from "@/types/mfa";
import { client, type AuthLoginResponseDto } from "@repo/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKeys } from "./users";

export type {
  AuthLoginMfaChallengeResponseDto,
  AuthMfaEnableResponseDto,
  AuthMfaSetupResponseDto,
};

// Untyped calls until `pnpm generate:client` adds the MFA endpoints; then
// swap each `post(...)` for its generated `authMfaSharedController...V1` /
// `authPublicControllerLoginWithMfaV1` function.
const API_KEY = { name: "x-api-key", type: "apiKey" } as const;
const BEARER = { key: "accessToken", scheme: "bearer", type: "http" } as const;

async function post<T>(
  url: string,
  body?: unknown,
  options?: { authenticated?: boolean; withCredentials?: boolean },
): Promise<T> {
  const response = await client.post<{ 200: { data: T } }, unknown, true>({
    url,
    body,
    responseType: "json",
    throwOnError: true,
    withCredentials: options?.withCredentials,
    security: options?.authenticated === false ? [API_KEY] : [BEARER, API_KEY],
    headers: { "Content-Type": "application/json" },
  });
  return response.data.data;
}

export const isMfaChallenge = (
  data: AuthLoginResponseDto | AuthLoginMfaChallengeResponseDto,
): data is AuthLoginMfaChallengeResponseDto =>
  (data as AuthLoginMfaChallengeResponseDto).mfaRequired === true;

export const useLoginWithMfa = () =>
  useMutation({
    mutationFn: (body: AuthLoginMfaRequestDto) =>
      post<AuthLoginResponseDto>("/api/v1/public/auth/login/mfa", body, {
        authenticated: false,
        withCredentials: true,
      }),
  });

export const useMfaSetup = () =>
  useMutation({
    mutationFn: () =>
      post<AuthMfaSetupResponseDto>("/api/v1/shared/auth/mfa/setup"),
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
    mutationFn: (code: string) =>
      post<AuthMfaEnableResponseDto>("/api/v1/shared/auth/mfa/enable", {
        code,
      }),
    onSuccess: invalidateMe,
  });
};

export const useMfaDisable = () => {
  const invalidateMe = useInvalidateMe();
  return useMutation({
    mutationFn: (body: AuthMfaDisableRequestDto) =>
      post<void>("/api/v1/shared/auth/mfa/disable", body),
    onSuccess: invalidateMe,
  });
};
