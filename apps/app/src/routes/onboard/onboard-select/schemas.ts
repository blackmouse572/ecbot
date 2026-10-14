import i18n from "@/i18n";
import z from "zod/v4";

export const onboardWelcomeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, i18n.t("errors.required"))
    .max(255, i18n.t("errors.maxLength", { maxLength: 255 })),
  type: z.string(),
});

export type OnboardWelcomeValues = z.infer<typeof onboardWelcomeSchema>;
