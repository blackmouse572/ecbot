import { t } from "i18next";
import { z } from "zod/v4";

export const profileEditSchema = () =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("errors.required"))
      .max(100, t("errors.maxLength", { maxLength: 100 })),
    country: z.string().min(1, t("errors.required")),
  });

export type ProfileEditFormData = z.infer<ReturnType<typeof profileEditSchema>>;
