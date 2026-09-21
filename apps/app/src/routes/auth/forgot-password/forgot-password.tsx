import { LinkButton } from "@/components/common";
import { useRequestPasswordReset } from "@/hooks/api";
import { ROUTES } from "@/routes/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@medusajs/ui";
import { HoneypotField, useHoneypot } from "@repo/auth/components";
import { Form, Input } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { forgotPasswordSchema, type TForgotPasswordSchema } from "../schemas";

const I18N_PREFIX = "app.auth.forgotPassword";

function ForgotPasswordPage() {
  const { t } = useTranslation(undefined, { keyPrefix: I18N_PREFIX });
  const navigate = useNavigate();
  const { requestReset, isLoading } = useRequestPasswordReset();
  const honeypot = useHoneypot();

  const form = useForm<TForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    if (honeypot.isTrapped()) return;
    try {
      // The token comes back on the request itself; the OTP is what gets emailed.
      const { token } = await requestReset(email);
      navigate({
        pathname: `/${ROUTES.ResetPassword}`,
        search: `?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
      });
    } catch {
      toast.error(t("errors.requestFailed"));
    }
  });

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
