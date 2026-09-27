import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "@repo/ui/common-components";
import type { UseFormReturn } from "react-hook-form";
import type { KnowledgeItemCreateFormValues } from "../schema";
import { Textarea, Input } from "@medusajs/ui";

interface UrlFormProps {
  form: UseFormReturn<KnowledgeItemCreateFormValues>;
}

export const UrlForm: FC<UrlFormProps> = ({ form }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* URL */}
      <Form.Field
        control={form.control}
        name="content"
        shouldUnregister
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("knowledge_item.url")}</Form.Label>
            <Form.Control>
              <Input {...field} type="url" placeholder="https://example.com" />
            </Form.Control>
            <Form.Hint>{t("knowledge_item.url_hint")}</Form.Hint>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      {/* Description/Notes */}
      <Form.Field
        control={form.control}
        name="metadata.content"
        shouldUnregister
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>{t("knowledge_item.description")}</Form.Label>
            <Form.Control>
              <Textarea
                {...field}
                value={field.value as string}
                placeholder={t("knowledge_item.description_placeholder")}
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
