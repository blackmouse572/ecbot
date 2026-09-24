import { LinkButton } from "@/components/common";
import { useRequestPasswordReset } from "@/hooks/api";
import { ROUTES } from "@/routes/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@medusajs/ui";
import { HoneypotField, useHoneypot } from "@repo/auth/components";
import { Form, Input } from "@repo/ui/common-components";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { forgotPasswordSchema, type TForgotPasswordSchema } from "../schemas";

const I18N_PREFIX = "app.auth.forgotPassword";

function ForgotPasswordPage() {
  const { t } = useTranslation(undefined, { keyPrefix: I18N_PREFIX });
  const { requestReset, isLoading } = useRequestPasswordReset();
  const honeypot = useHoneypot();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<TForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    if (honeypot.isTrapped()) return;
    try {
      await requestReset(email);
    } catch {
      // No enumeration: a failed request shows the exact same state as a
      // successful one — never reveal whether the email has an account.
    }
    setSubmitted(true);
  });

  if (submitted) {
    return (
      <div className="flex w-[280px] flex-col items-center gap-y-4 text-center">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-ui-fg-base text-base font-medium leading-normal">
            {t("checkEmail.title")}
          </h1>
          <p className="txt-compact-xsmall-plus text-ui-fg-muted">
            {t("checkEmail.description")}
          </p>
        </div>
        <p className="txt-compact-small text-ui-fg-muted">
          <Trans
            i18nKey={`${I18N_PREFIX}.actions.backToLogin`}
            components={[<LinkButton to={`/${ROUTES.Login}`} />]}
          />
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-[280px] flex-col gap-y-4">
      <div className="flex flex-col items-center gap-y-1 text-center">
        <h1 className="text-ui-fg-base text-base font-medium leading-normal">
          {t("title")}
        </h1>
        <p className="txt-compact-xsmall-plus text-ui-fg-muted">
          {t("description")}
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={onSubmit}
          className="relative flex w-full flex-col gap-y-4"
        >
          <HoneypotField ref={honeypot.ref} />
          <Form.Field
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    autoComplete="email"
                    autoFocus
                    errorMessage={fieldState.error?.message}
                    {...field}
                    className="bg-ui-bg-field-component"
                    placeholder={t("fields.email")}
                  />
                </Form.Control>
              </Form.Item>
            )}
          />
          <Button
            variant="primary"
            className="w-full"
            type="submit"
            isLoading={isLoading}
          >
            {t("actions.submit")}
          </Button>
        </form>
      </Form>

      <p className="txt-compact-small text-ui-fg-muted text-center">
        <Trans
          i18nKey={`${I18N_PREFIX}.actions.backToLogin`}
          components={[<LinkButton to={`/${ROUTES.Login}`} />]}
        />
      </p>
    </div>
  );
}

export { ForgotPasswordPage };
