import { formatFileSize } from "@/utils";
import { Text } from "@medusajs/ui";
import {
  FilePreview,
  FileUpload,
  Form,
  type FileType,
} from "@repo/ui/common-components";
import type { FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KB_MEDIA_IMAGE_MIMES, KB_MEDIA_PDF_MIME } from "../../../constants";
import type { KnowledgeItemCreateFormValues, MediaUpload } from "../schema";

interface MediaFormProps {
  form: UseFormReturn<KnowledgeItemCreateFormValues>;
  isLoading?: boolean;
  /** Upload state of each file, by its id. */
  uploads?: Record<string, MediaUpload>;
  onRetry?: (file: FileType) => void;
}

export const MediaForm: FC<MediaFormProps> = ({
  form,
  isLoading,
  uploads = {},
  onRetry,
}) => {
  const { t } = useTranslation();

  return (
    <Form.Field
      control={form.control}
      name="files"
      shouldUnregister
      render={({ field, fieldState }) => {
        const files: FileType[] = field.value ?? [];
        const states = files.map(({ id }) => uploads[id]?.status);
        const started = states.filter(Boolean).length;
        const done = states.filter((status) => status === "done").length;
        const failed = states.filter((status) => status === "failed").length;
        const totalSize = files.reduce((sum, { file }) => sum + file.size, 0);
        return (
          <Form.Item>
            <Form.Label>{t("knowledge_item.media.files")}</Form.Label>
            <Form.Hint>{t("knowledge_item.media.files_hint")}</Form.Hint>
            <Form.Control>
              <FileUpload
                label={t("knowledge_item.media.pick")}
                hint={
                  <>
                    {t("knowledge_item.media.formats")}
                    <br />
                    {t("knowledge_item.media.cost_hint")}
                  </>
                }
                multiple
                hasError={!!fieldState.error}
                onUploaded={(picked) => field.onChange([...files, ...picked])}
                formats={[...KB_MEDIA_IMAGE_MIMES, KB_MEDIA_PDF_MIME]}
              />
            </Form.Control>
            {files.length > 0 && (
              <Text size="small" className="text-ui-fg-subtle" role="status">
                {started === 0
                  ? t("knowledge_item.media.upload_total", {
                      count: files.length,
                      size: formatFileSize(totalSize),
                    })
                  : t(
                      failed
                        ? "knowledge_item.media.upload_summary_failed"
                        : "knowledge_item.media.upload_summary",
                      { done, failed, count: files.length },
                    )}
              </Text>
            )}
            {files.length > 0 && (
              <div className="flex flex-col gap-y-2">
                {files.map((file) => {
                  const upload = uploads[file.id];
                  return (
                    <FilePreview
                      key={file.id}
                      filename={file.file.name}
                      mime={file.file.type || file.file.name}
                      description={formatFileSize(file.file.size)}
                      progress={
                        upload?.status === "uploading"
                          ? upload.progress
                          : undefined
                      }
                      status={
                        upload?.status === "done" ? (
                          t("knowledge_item.media.uploaded")
                        ) : upload?.status === "failed" ? (
                          <span className="text-ui-fg-error">
                            {t("knowledge_item.media.failed_at", {
                              progress: upload.progress,
                            })}
                          </span>
                        ) : undefined
                      }
                      // Spinner only on files still waiting their turn.
                      loading={isLoading && !upload}
                      onRetry={
                        upload?.status === "failed" && onRetry && !isLoading
                          ? () => onRetry(file)
                          : undefined
                      }
                      onRemove={
                        isLoading
                          ? undefined
                          : () =>
                              field.onChange(
                                files.filter(({ id }) => id !== file.id),
                              )
                      }
                    />
                  );
                })}
              </div>
            )}
            <Form.ErrorMessage />
          </Form.Item>
        );
      }}
    />
  );
};
