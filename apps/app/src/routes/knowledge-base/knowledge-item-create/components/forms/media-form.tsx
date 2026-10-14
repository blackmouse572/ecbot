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
import {
  KB_MEDIA_IMAGE_MIMES,
  KB_MEDIA_IMAGE_TOKENS,
  KB_MEDIA_PDF_MIME,
  KB_MEDIA_PDF_PICTURE_PAGE_TOKENS,
} from "../../../constants";
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
  const { t, i18n } = useTranslation();

  return (
    <Form.Field
      control={form.control}
      name="files"
      shouldUnregister
      render={({ field, fieldState }) => {
        const files: FileType[] = field.value ?? [];
        const pdfs = files.filter(
          ({ file }) => file.type === KB_MEDIA_PDF_MIME,
        ).length;
        const images = files.length - pdfs;
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
            <div className="bg-ui-bg-subtle flex flex-col gap-y-1 rounded-lg p-3">
              <Text size="small" className="text-ui-fg-subtle">
                {t("knowledge_item.media.cost_hint")}
              </Text>
              {files.length > 0 && (
                <Text size="small" weight="plus">
                  {images > 0 &&
                    t("knowledge_item.media.cost_estimate_images", {
                      tokens: new Intl.NumberFormat(i18n.language).format(
                        images * KB_MEDIA_IMAGE_TOKENS,
                      ),
                      images,
                    })}
                  {pdfs > 0 &&
                    t(
                      images > 0
                        ? "knowledge_item.media.cost_estimate_pdfs"
                        : "knowledge_item.media.cost_estimate_pdfs_only",
                      {
                        count: pdfs,
                        pageTokens: KB_MEDIA_PDF_PICTURE_PAGE_TOKENS,
                      },
                    )}
                </Text>
              )}
            </div>
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
