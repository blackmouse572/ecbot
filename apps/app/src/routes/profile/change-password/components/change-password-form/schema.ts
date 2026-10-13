import { isStrongPassword } from "@repo/ui/utils";
import { z } from "zod/v4";

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().refine(isStrongPassword, { error: "weak" }),
    confirmNewPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    error: "sameAsCurrent",
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    error: "passwordMismatch",
  });

export type TChangePasswordFormSchema = z.infer<
  typeof changePasswordFormSchema
>;
