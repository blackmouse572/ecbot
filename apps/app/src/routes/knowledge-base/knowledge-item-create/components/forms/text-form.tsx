import { Textarea } from "@medusajs/ui";
import type { KnowledgeItemCreateRequestDto } from "@repo/client";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface TextFormProps {
  form: UseFormReturn<KnowledgeItemCreateRequestDto>;
}

export const TextForm: FC<TextFormProps> = ({ form }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Content/Text */}
      <Form.Field
        control={form.control}
        name="content"
        shouldUnregister
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("knowledge_item.content")}</Form.Label>
            <Form.Control>
              <Textarea
                {...field}
                placeholder={t("knowledge_item.content_placeholder")}
                rows={8}
              />
            </Form.Control>
            <Form.ErrorMessage />
            <Form.Hint>{t("knowledge_item.content_hint")}</Form.Hint>
          </Form.Item>
        )}
      />
    </div>
  );
};
