import {} from "@medusajs/ui";
import { Form, OTPInput } from "@repo/ui/common-components";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
export const OnboardJoinTab = () => {
  const form = useFormContext();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        <Form.Field
          name="invitationCode"
          control={form.control}
          render={({ field }) => (
            <Form.Item className="flex flex-col items-center gap-2">
              <Form.Label>{t("onboard.join.fields.code")}</Form.Label>
              <Form.Control>
                <OTPInput
                  length={6}
                  value={field.value}
                  onChange={field.onChange}
                  type="both"
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>
    </div>
  );
};
