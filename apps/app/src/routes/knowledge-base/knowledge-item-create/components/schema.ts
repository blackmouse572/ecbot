import i18n from "@/i18n";
import z from "zod";

// Form schemas for each type
const baseSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const createFileSchema = () =>
  baseSchema.extend({
    file: z.object(
      {
        url: z.string(),
        file: z
          .file()
          .mime([
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "text/markdown",
            "text/html",
          ])
          .max(5 * 1024 * 1024),
        id: z.string(),
      },
      {
        error: i18n.t("errors.uploadFile"),
      },
    ),
  });

type FileSchema = z.infer<ReturnType<typeof createFileSchema>>;

const createUrlSchema = () =>
  baseSchema.extend({
    // Explicit shape (not z.record) so an unset description validates as
    // undefined, not as a record entry requiring a string value.
    metadata: z
      .object({
        content: z.string().optional(),
      })
      .optional(),
  });

type UrlSchema = z.infer<ReturnType<typeof createUrlSchema>>;

const createTextSchema = () => baseSchema;

type TextSchema = z.infer<ReturnType<typeof createTextSchema>>;

/**
 * One stable shape for `useForm`. The active schema swaps with the selected
 * type but the form instance does not, so every variant-only field is optional
 * here and validated by whichever schema is live.
 */
type KnowledgeItemCreateFormValues = TextSchema &
  Partial<Pick<FileSchema, "file">> &
  Partial<Pick<UrlSchema, "metadata">> & {
    type: "FILE" | "URL" | "TEXT";
  };

export { createFileSchema, createUrlSchema, createTextSchema };
export type {
  FileSchema,
  UrlSchema,
  TextSchema,
  KnowledgeItemCreateFormValues,
};
