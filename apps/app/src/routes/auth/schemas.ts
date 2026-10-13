import { isStrongPassword } from "@repo/ui/utils";
import { z } from "zod/v4";

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export type TForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().refine(isStrongPassword, { error: "weak" }),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "passwordMismatch",
  });

export type TResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
