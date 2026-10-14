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
import type { KnowledgeItemCreateFormValues } from "../schema";

interface MediaFormProps {
  form: UseFormReturn<KnowledgeItemCreateFormValues>;
  isLoading?: boolean;
  /** Files already uploaded in the running batch, by id. */
  uploadedIds?: string[];
}

export const MediaForm: FC<MediaFormProps> = ({
  form,
  isLoading,
  uploadedIds = [],
}) => {
  const { t } = useTranslation();

  return (
    <Form.Field
      control={form.control}
      name="files"
      shouldUnregister
      render={({ field, fieldState }) => {
        const files: FileType[] = field.value ?? [];
        return (
          <Form.Item>
            <Form.Label>{t("knowledge_item.media.files")}</Form.Label>
            <Form.Hint>{t("knowledge_item.media.files_hint")}</Form.Hint>
            <Form.Control>
              <FileUpload
                label={t("knowledge_item.media.pick")}
                hint={t("knowledge_item.media.formats")}
                multiple
                hasError={!!fieldState.error}
                onUploaded={(picked) => field.onChange([...files, ...picked])}
                formats={[...KB_MEDIA_IMAGE_MIMES, KB_MEDIA_PDF_MIME]}
              />
            </Form.Control>
            <Text size="small" className="text-ui-fg-subtle">
              {t("knowledge_item.media.cost_hint")}
            </Text>
            {files.length > 0 && (
              <div className="flex flex-col gap-y-2">
                {files.map((file) => {
                  const uploaded = uploadedIds.includes(file.id);
                  return (
                    <FilePreview
                      key={file.id}
                      filename={file.file.name}
                      loading={isLoading && !uploaded}
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
