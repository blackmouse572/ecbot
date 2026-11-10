import { t } from "i18next";
import { z as zod } from "zod/v4";

const targetUrl = zod
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^https?:\/\/\S+\.\S+/.test(value),
    t("customerSources.form.errors.targetUrl"),
  );

const greeting = zod.string().trim().max(1000);
const tagIds = zod.array(zod.string());

export const sourceCreateSchema = zod
  .object({
    name: zod
      .string()
      .trim()
      .min(1, t("customerSources.form.errors.name"))
      .max(120),
    accountId: zod.string().min(1, t("customerSources.form.errors.channel")),
    isWebsite: zod.boolean(),
    targetUrl,
    greeting,
    tagIds,
  })
  .refine((value) => !value.isWebsite || value.targetUrl !== "", {
    path: ["targetUrl"],
    message: t("customerSources.form.errors.targetUrl"),
  });

export type SourceCreateFormData = zod.infer<typeof sourceCreateSchema>;

export const sourceEditSchema = zod
  .object({
    name: zod
      .string()
      .trim()
      .min(1, t("customerSources.form.errors.name"))
      .max(120),
    isWebsite: zod.boolean(),
    targetUrl,
    greeting,
    tagIds,
  })
  .refine((value) => !value.isWebsite || value.targetUrl !== "", {
    path: ["targetUrl"],
    message: t("customerSources.form.errors.targetUrl"),
  });

export type SourceEditFormData = zod.infer<typeof sourceEditSchema>;

export const sourceLinkSchema = zod.object({
  name: zod
    .string()
    .trim()
    .min(1, t("customerSources.child.errors.name"))
    .max(120),
});

export type SourceLinkFormData = zod.infer<typeof sourceLinkSchema>;
