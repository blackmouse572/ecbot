import { Input, Text } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

type WhatsAppCredentialValues = {
  phoneNumberId: string;
  accessToken: string;
};

export const WhatsAppCredentialFields = () => {
  const { t } = useTranslation();
  const form = useFormContext<WhatsAppCredentialValues>();

  return (
    <>
      <Form.Field
        name="phoneNumberId"
        control={form.control}
        rules={{
          required: t("accounts.create.connect.whatsapp.phoneNumberIdLabel"),
          pattern: {
            value: /^\s*\d+\s*$/,
            message: t("accounts.create.connect.whatsapp.phoneNumberIdInvalid"),
          },
        }}
        render={({ field }) => (
          <Form.Item className="flex flex-col gap-y-2">
            <Form.Label>
              {t("accounts.create.connect.whatsapp.phoneNumberIdLabel")}
            </Form.Label>
            <Form.Control>
              <Input
                inputMode="numeric"
                placeholder="106540352242922"
                autoComplete="off"
                {...field}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        name="accessToken"
        control={form.control}
        rules={{
          required: t("accounts.create.connect.whatsapp.tokenLabel"),
        }}
        render={({ field }) => (
          <Form.Item className="flex flex-col gap-y-2">
            <Form.Label>
              {t("accounts.create.connect.whatsapp.tokenLabel")}
            </Form.Label>
            <Form.Control>
              <Input
                type="password"
                placeholder={t(
                  "accounts.create.connect.whatsapp.tokenPlaceholder",
                )}
                autoComplete="off"
                {...field}
              />
            </Form.Control>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("accounts.create.connect.whatsapp.tokenHint")}
            </Text>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </>
  );
};
