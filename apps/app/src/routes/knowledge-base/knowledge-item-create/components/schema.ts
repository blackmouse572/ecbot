import i18n from "@/i18n";
import z from "zod";
import {
  KB_MEDIA_IMAGE_MAX_BYTES,
  KB_MEDIA_IMAGE_MIMES,
  KB_MEDIA_MAX_FILES,
  KB_MEDIA_PDF_MAX_BYTES,
  KB_MEDIA_PDF_MIME,
} from "../../constants";

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

const isMediaFile = (file: File) =>
  file.type === KB_MEDIA_PDF_MIME
    ? file.size <= KB_MEDIA_PDF_MAX_BYTES
    : KB_MEDIA_IMAGE_MIMES.includes(file.type) &&
      file.size <= KB_MEDIA_IMAGE_MAX_BYTES;

// Each picked file becomes its own item named after it, so there is no title.
const createMediaSchema = () =>
  z.object({
    tags: z.array(z.string()).optional(),
    files: z
      .array(z.object({ id: z.string(), url: z.string(), file: z.file() }), {
        error: i18n.t("knowledge_item.media.required"),
      })
      .min(1, { error: i18n.t("knowledge_item.media.required") })
      .max(KB_MEDIA_MAX_FILES, {
        error: i18n.t("knowledge_item.media.too_many", {
          count: KB_MEDIA_MAX_FILES,
        }),
      })
      .refine((files) => files.every(({ file }) => isMediaFile(file)), {
        error: i18n.t("knowledge_item.media.invalid"),
      }),
  });

type MediaSchema = z.infer<ReturnType<typeof createMediaSchema>>;

type TextSchema = z.infer<ReturnType<typeof createTextSchema>>;

/**
 * One stable shape for `useForm`. The active schema swaps with the selected
 * type but the form instance does not, so every variant-only field is optional
 * here and validated by whichever schema is live.
 */
type KnowledgeItemCreateFormValues = TextSchema &
  Partial<Pick<FileSchema, "file">> &
  Partial<Pick<UrlSchema, "metadata">> &
  Partial<Pick<MediaSchema, "files">> & {
    type: "FILE" | "URL" | "TEXT" | "MEDIA";
  };

export {
  createFileSchema,
  createUrlSchema,
  createTextSchema,
  createMediaSchema,
};
export type {
  FileSchema,
  MediaSchema,
  UrlSchema,
  TextSchema,
  KnowledgeItemCreateFormValues,
};
