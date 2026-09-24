import { queryKeysFactory } from "@/libs/query-factory";
import {
  resetPasswordPublicControllerGetV1,
  resetPasswordPublicControllerRequestV1,
  resetPasswordPublicControllerResetV1,
  resetPasswordPublicControllerVerifyV1,
  type ResetPasswordCreteResponseDto,
} from "@repo/client";
import { useMutation, useQuery } from "@tanstack/react-query";

export const RESET_PASSWORD_QUERY_KEY = "reset-password" as const;
export const resetPasswordQueryKeys = queryKeysFactory(
  RESET_PASSWORD_QUERY_KEY,
);

/**
 * Starts the flow: always resolves with the same empty ack, whether or not
 * the email has an account — no enumeration. The reset link and OTP are
 * delivered by email only, never on this response.
 */
export const useRequestPasswordReset = () => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (email: string) => {
      const response = await resetPasswordPublicControllerRequestV1({
        body: { email },
        throwOnError: false,
      });
      if (response.error) {
        console.error("[useRequestPasswordReset] error: ", response.error);
        throw response.error;
      }
    },
  });

  return { requestReset: mutateAsync, isLoading: isPending };
};

/** Validates a token up front so an expired link shows a dead-end state, not a broken form. */
export const useResetPasswordToken = (token: string) => {
  const { data, ...rest } = useQuery({
    queryKey: resetPasswordQueryKeys.detail(token),
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const response = await resetPasswordPublicControllerGetV1({
        path: { token },
        throwOnError: false,
      });
      if (response.error) {
        throw response.error;
      }
      return (response.data as A).data as ResetPasswordCreteResponseDto;
    },
  });

  return { ...rest, resetPassword: data };
};

export const useVerifyPasswordResetOtp = (token: string) => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (otp: string) => {
      const response = await resetPasswordPublicControllerVerifyV1({
        path: { token },
        body: { otp },
        throwOnError: false,
      });
      if (response.error) {
        console.error("[useVerifyPasswordResetOtp] error: ", response.error);
        throw response.error;
      }
      return true;
    },
  });

  return { verifyOtp: mutateAsync, isLoading: isPending };
};

export const useResetPassword = (token: string) => {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (newPassword: string) => {
      const response = await resetPasswordPublicControllerResetV1({
        path: { token },
        body: { newPassword },
        throwOnError: false,
      });
      if (response.error) {
        console.error("[useResetPassword] error: ", response.error);
        throw response.error;
      }
      return true;
    },
  });

  return { resetPassword: mutateAsync, isLoading: isPending };
};
