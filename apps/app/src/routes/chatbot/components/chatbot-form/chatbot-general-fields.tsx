import { Input } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ChatbotFormInput } from "../../schemas";
import { ChatbotTypeField } from "./chatbot-type-field";

/** Name and type: what the general card shows. */
export function ChatbotGeneralFields() {
  const { t } = useTranslation();
  const { control } = useFormContext<ChatbotFormInput>();

  return (
    <>
      <Form.Field
        name="name"
        control={control}
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("chatbot.edit.name")}</Form.Label>
            <Form.Control>
              <Input
                placeholder={t("chatbot.create.namePlaceholder")}
                {...field}
                className="w-full"
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <Form.Field
        name="type"
        control={control}
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("chatbot.edit.type")}</Form.Label>
            <Form.Control>
              <ChatbotTypeField value={field.value} onChange={field.onChange} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </>
  );
}
