import { formatFileSize } from "@/utils";
import { Spinner, XMark } from "@medusajs/icons";
import { IconButton, Text } from "@medusajs/ui";
import { FileUpload, Form, type FileType } from "@repo/ui/common-components";
import {
  FileType as FileTypeIcon,
  getFileType,
} from "@repo/ui/components/ui/file-type";
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
              <ul className="flex flex-col gap-y-2">
                {files.map((file) => {
                  const uploaded = uploadedIds.includes(file.id);
                  return (
                    <li
                      key={file.id}
                      className="flex items-center gap-x-3 rounded-lg border border-ui-border-base px-3 py-2"
                    >
                      {/* The name below ends in its extension. */}
                      <FileTypeIcon
                        type={getFileType(file.file.type || file.file.name)}
                        size="sm"
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Text
                          size="small"
                          leading="compact"
                          weight="plus"
                          className="truncate"
                          title={file.file.name}
                        >
                          {file.file.name}
                        </Text>
                        <Text
                          size="xsmall"
                          leading="compact"
                          className="text-ui-fg-subtle tabular-nums"
                        >
                          {formatFileSize(file.file.size)}
                        </Text>
                      </div>
                      {isLoading && !uploaded ? (
                        <Spinner className="animate-spin text-ui-fg-muted" />
                      ) : (
                        !isLoading && (
                          <IconButton
                            type="button"
                            size="small"
                            variant="transparent"
                            aria-label={t("actions.delete")}
                            onClick={() =>
                              field.onChange(
                                files.filter(({ id }) => id !== file.id),
                              )
                            }
                          >
                            <XMark />
                          </IconButton>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <Form.ErrorMessage />
          </Form.Item>
        );
      }}
    />
  );
};
