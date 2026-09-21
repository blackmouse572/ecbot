import { TipTapEditor } from "@/components/common/tiptap-editor/tiptap-editor";
import { Input, Textarea } from "@medusajs/ui";
import { FileUpload, Form, type FileType } from "@repo/ui/common-components";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { SkillFormData } from "../schemas";

type Props = {
  form: UseFormReturn<SkillFormData>;
};

// Shared skill fields — embedded in the create modal and the edit drawer.
export const SkillFormFields = ({ form }: Props) => {
  const { t } = useTranslation();

  const handleImport = async (files: FileType[]) => {
    const file = files[0]?.file;
    if (!file) return;
    form.setValue("instructions", await file.text(), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="flex flex-col gap-y-6">
      <Form.Field
        control={form.control}
        name="name"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("fields.name")}</Form.Label>
            <Form.Control>
              <Input
                {...field}
                placeholder={t("skills.form.namePlaceholder")}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <Form.Field
        control={form.control}
        name="description"
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>{t("fields.description")}</Form.Label>
            <Form.Hint>{t("skills.form.descriptionHint")}</Form.Hint>
            <Form.Control>
              <Textarea {...field} rows={2} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <Form.Field
        control={form.control}
        name="instructions"
        render={({ field, fieldState }) => (
          <Form.Item>
            <Form.Label>{t("skills.form.instructions")}</Form.Label>
            <Form.Hint>{t("skills.form.instructionsHint")}</Form.Hint>
            <FileUpload
              label={t("actions.import")}
              hint={t("skills.form.importHint")}
              multiple={false}
              hasError={!!fieldState.error}
              formats={["text/markdown", "text/x-markdown", "text/plain"]}
              onUploaded={handleImport}
            />
            <Form.Control>
              <TipTapEditor
                value={field.value}
                onChange={field.onChange}
                placeholder={t("skills.form.instructionsHint")}
                format="markdown"
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </div>
  );
};
