import { t } from "i18next";
import zod from "zod";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Edit-form schema for one workspace. Its current slug is accepted as-is:
 * workspaces created before slugs were lowercased carry capitals, and a name
 * edit must not be blocked by a slug the owner never touched. A changed slug
 * must be lowercase.
 */
export const createWorkspaceEditSchema = (currentSlug: string) =>
  zod.object({
    name: zod
      .string()
      .min(1, t("errors.required"))
      .max(255, t("errors.maxLength", { maxLength: 255 })),
    slug: zod
      .string()
      .min(1, t("errors.required"))
      .max(255, t("errors.maxLength", { maxLength: 255 }))
      .refine(
        (slug) => slug === currentSlug || SLUG_PATTERN.test(slug),
        t("errors.slug"),
      ),
    avatar: zod
      .object({
        file: zod
          .instanceof(File)
          .refine(
            (file) => file.size <= 1024 * 1024 * 5,
            t("errors.maxFileSize", { maxFileSize: 5 }),
          )
          .optional(),
        url: zod.string(),
      })
      .optional(),
  });

export type WorkspaceEditFormData = zod.infer<
  ReturnType<typeof createWorkspaceEditSchema>
>;
