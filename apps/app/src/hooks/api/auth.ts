import { logoutGuard, useAuth } from "@/modules/auth";
import { useSetLastWorkspaceSlug } from "@/modules/workspace";
import {
  authPublicControllerLoginWithCredentialV1,
  authPublicControllerSignUpV1,
  authSharedControllerChangePasswordV1,
  authSharedControllerLogoutV1,
  authSharedControllerRefreshV1,
  type AuthChangePasswordRequestDto,
  verificationEmailControllerResendVerificationEmailV1,
  verificationEmailControllerVerifyEmailV1,
  type AuthLoginRequestDto,
  type AuthLoginResponseDto,
  type AuthPublicControllerSignUpV1Error,
  type AuthSignUpRequestDto,
} from "@repo/client";
import type { UseMutationOptions } from "@tanstack/react-query";
import { RESET } from "jotai/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// The backend's 403 body (ForbiddenException for BLOCKED/INACTIVE users etc.)
// is { statusCode, message } — see ResponseDto in @repo/client. statusCode is
// kept (not just message) so callers can branch on it, e.g. to distinguish a
// banned user (BLOCKED_FORBIDDEN = 5159) from a generic inactive/auth error.
export interface AuthLoginError {
  statusCode?: number;
  message: string;
}

export const USER_BLOCKED_FORBIDDEN_STATUS_CODE = 5159;

export const useSignInWithEmailPass = (
  options?: UseMutationOptions<
    AuthLoginResponseDto,
    AuthLoginError,
    AuthLoginRequestDto
  >,
) => {
  return useMutation({
    mutationFn: async (payload) => {
      const response = await authPublicControllerLoginWithCredentialV1({
        body: payload,
        throwOnError: false,
        withCredentials: true,
      });
      if (response.error) {
        console.error("[useSignInWithEmailPass] error: ", response.error);
        throw response.error as A as AuthLoginError;
      }
      return (response.data as A).data as AuthLoginResponseDto;
    },
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useSignUpWithEmailPass = (
  options?: UseMutationOptions<
    string,
    AuthPublicControllerSignUpV1Error,
    AuthSignUpRequestDto
  >,
) => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload) => {
      const response = await authPublicControllerSignUpV1({ body: payload });
      if (response.error) {
        console.error("[useSignUpWithEmailPass] error: ", response.error);
        throw response.error;
      }
      return (response.data as A)?.data?.userId;
    },
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });

  return {
    signUp: mutateAsync,
    isLoading: isPending,
  };
};

export const useChangePassword = () => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload: AuthChangePasswordRequestDto) => {
      const response = await authSharedControllerChangePasswordV1({
        body: payload,
        throwOnError: false,
      });
      if (response.error) {
        console.error("[useChangePassword] error: ", response.error);
        throw response.error;
      }
      return true;
    },
  });

  return {
    changePassword: mutateAsync,
    isLoading: isPending,
  };
};

export const useVerifyEmailOtp = (email: string, userId: string) => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (otp: string) => {
      const payload = {
        email,
        id: userId,
        otp,
      };
      const response = await verificationEmailControllerVerifyEmailV1({
        body: payload,
      });
      if (response.error) {
        console.error("[useVerifyEmailOtp] error: ", response.error);
        throw response.error;
      }
      return true;
    },
  });

  return {
    verifyEmail: mutateAsync,
    isLoading: isPending,
  };
};

const requestOtpResend = (email: string, userId: string) =>
  verificationEmailControllerResendVerificationEmailV1({
    body: { email, id: userId },
  });

export const useResendEmailOtp = (email: string, userId: string) => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await requestOtpResend(email, userId);
      if (error) {
        console.error("[useResendEmailOtp] error: ", error);
        throw error;
      }
      return true;
    },
  });

  return {
    resendEmailOtp: mutateAsync,
    isLoading: isPending,
  };
};

// export const useResetPasswordForEmailPass = (
//   options?: UseMutationOptions<void, FetchError, { email: string }>
// ) => {
//   return useMutation({
//     mutationFn: (payload) =>
//       sdk.auth.resetPassword("user", "emailpass", {
//         identifier: payload.email,
//       }),
//     onSuccess: async (data, variables, context) => {
//       options?.onSuccess?.(data, variables, context);
//     },
//     ...options,
//   });
// };

// export const useUpdateProviderForEmailPass = (
//   token: string,
//   options?: UseMutationOptions<void, FetchError, HttpTypes.AdminUpdateProvider>
// ) => {
//   return useMutation({
//     mutationFn: (payload) =>
//       sdk.auth.updateProvider("user", "emailpass", payload, token),
//     onSuccess: async (data, variables, context) => {
//       options?.onSuccess?.(data, variables, context);
//     },
//     ...options,
//   });
// };

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: () => {
      return authSharedControllerRefreshV1({
        withCredentials: true,
        headers: {
          Authorization: null,
        },
        throwOnError: false,
      });
    },
  });
};

export const useLogout = () => {
  const setLastWorkspaceSlug = useSetLastWorkspaceSlug();
  const navigate = useNavigate();
  const [_, setAuth] = useAuth();
  const queryClient = useQueryClient();

  const logout = async (options?: { to?: string }) => {
    logoutGuard.current = true;
    try {
      await authSharedControllerLogoutV1({
        withCredentials: true,
        throwOnError: false,
      });
    } catch (error) {
      console.error("[useLogout] server logout failed: ", error);
    } finally {
      setAuth(null);
      setLastWorkspaceSlug(RESET);
      queryClient.cancelQueries();
      queryClient.invalidateQueries();
      queryClient.clear();
      navigate(options?.to ?? "/login");
      logoutGuard.current = false;
    }
  };

  return logout;
};
