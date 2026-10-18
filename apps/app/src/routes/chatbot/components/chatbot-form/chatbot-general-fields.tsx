import { Input, Select } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { lazy, Suspense } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { languageName } from "@/libs/language-name";
import { CHATBOT_LANGUAGES } from "../../constants";
import type { ChatbotFormInput } from "../../schemas";
import { ChatbotTypeField } from "./chatbot-type-field";

// Loaded on demand: the zone list and its virtualizer stay out of the form's
// initial bundle.
const TimezoneSelect = lazy(() =>
  import("../timezone-select").then((m) => ({ default: m.TimezoneSelect })),
);

/** Name, type, languages and timezone: what the general card shows. */
export function ChatbotGeneralFields() {
  const { t, i18n } = useTranslation();
  const { control } = useFormContext<ChatbotFormInput>();
  const languageItems = Object.keys(CHATBOT_LANGUAGES).map((code) => (
    <Select.Item key={code} value={code}>
      {languageName(code, i18n.language)}
    </Select.Item>
  ));

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

      <Form.Field
        name="primaryLanguage"
        control={control}
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("chatbot.create.primaryLanguage")}</Form.Label>
            <Form.Hint>{t("chatbot.create.primaryLanguageHint")}</Form.Hint>
            <Form.Control>
              <Select {...field} onValueChange={field.onChange}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>{languageItems}</Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <Form.Field
        name="deferedLanguage"
        control={control}
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>
              {t("chatbot.create.deferedLanguage")}
            </Form.Label>
            <Form.Hint>{t("chatbot.create.deferedLanguageHint")}</Form.Hint>
            <Form.Control>
              <Select
                {...field}
                value={field.value || ""}
                onValueChange={field.onChange}
              >
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>{languageItems}</Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <Form.Field
        name="timezone"
        control={control}
        render={({ field: { value, onChange, ref, ...field } }) => (
          <Form.Item>
            <Form.Label optional>{t("chatbot.create.timezone")}</Form.Label>
            <Form.Hint>{t("chatbot.create.timezoneHint")}</Form.Hint>
            <Suspense
              fallback={<div className="bg-ui-bg-field h-8 rounded-md" />}
            >
              <Form.Control>
                <TimezoneSelect
                  {...field}
                  ref={ref}
                  value={value}
                  onChange={onChange}
                />
              </Form.Control>
            </Suspense>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </>
  );
}
