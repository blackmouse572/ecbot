import { TipTapEditor } from "@/components/common/tiptap-editor";
import { Form } from "@repo/ui/common-components";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CHATBOT_MESSAGE_FIELDS } from "../../constants";
import type { ChatbotFormInput } from "../../schemas";

/** The fixed messages the agent sends, each with when it is sent. */
export function ChatbotMessageFields() {
  const { t } = useTranslation();
  const { control } = useFormContext<ChatbotFormInput>();

  return (
    <>
      {CHATBOT_MESSAGE_FIELDS.map((name) => (
        <Form.Field
          key={name}
          name={name}
          control={control}
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t(`chatbot.create.${name}`)}</Form.Label>
              <Form.Hint>{t(`chatbot.create.${name}Hint`)}</Form.Hint>
              <Form.Control>
                <TipTapEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t(`chatbot.create.${name}Placeholder`)}
                  className="w-full"
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      ))}
    </>
  );
}
