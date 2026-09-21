import { Textarea } from "@medusajs/ui";
import {
  FilePreview,
  FileUpload,
  Form,
  type FileType,
} from "@repo/ui/common-components";
import type { FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {} from "nuqs";
import type { FileSchema } from "../schema";

interface FileFormProps {
  form: UseFormReturn<FileSchema>;
  isLoading?: boolean;
  uploadProgress?: number;
}

export const FileForm: FC<FileFormProps> = ({
  form,
  isLoading,
  uploadProgress = 0,
}) => {
  const { t } = useTranslation();
  const handleUploaded = (
    files: FileType[],
    onChange: (file: FileType | undefined) => void,
  ) => {
    const firstFile = files[0];
    onChange(firstFile);
    const currentTitle = form.getValues("title");
    const fileName = firstFile?.file?.name;
    if (!currentTitle?.trim() && fileName) {
      const basename = fileName.replace(/\.[^/.]+$/, "") || fileName;
      form.setValue("title", basename, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <Form.Field
        control={form.control}
        name="file"
        shouldUnregister
        render={({ field, fieldState }) => (
          <Form.Item>
            <Form.Label>{t("knowledge_item.file")}</Form.Label>
            <Form.Control>
              <FileUpload
                label={t("knowledge_item.file")}
                hint={t("knowledge_item.file_hint")}
                multiple={false}
                hasError={!!fieldState.error}
                onUploaded={(files) => handleUploaded(files, field.onChange)}
                formats={[
                  "application/pdf",
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  "text/plain",
                  "text/markdown",
                  "text/html",
                ]}
              />
            </Form.Control>
            {field.value && (
              <FilePreview
                filename={field.value.file.name}
                loading={isLoading}
                activity={isLoading ? `${uploadProgress}%` : undefined}
                onRemove={() => {
                  field.onChange(null);
                }}
              />
            )}
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      {/* Description/Notes */}
      <Form.Field
        control={form.control}
        name="content"
        shouldUnregister
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>{t("knowledge_item.description")}</Form.Label>
            <Form.Control>
              <Textarea
                {...field}
                placeholder={t("knowledge_item.file_description_placeholder")}
                rows={4}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </div>
  );
};
