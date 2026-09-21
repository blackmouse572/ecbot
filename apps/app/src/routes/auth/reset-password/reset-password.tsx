import { LinkButton } from "@/components/common";
import {
  useResetPassword,
  useResetPasswordToken,
  useVerifyPasswordResetOtp,
} from "@/hooks/api";
import { ROUTES } from "@/routes/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@medusajs/ui";
import { HoneypotField, OTPInput, useHoneypot } from "@repo/auth/components";
import { CircularLoading, Form, Input } from "@repo/ui/common-components";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordSchema, type TResetPasswordSchema } from "../schemas";

const I18N_PREFIX = "app.auth.resetPassword";

const OTP_DIGIT_LENGTH = 6;

function ResetPasswordPage() {
  const { t } = useTranslation(undefined, { keyPrefix: I18N_PREFIX });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [otpVerified, setOtpVerified] = useState(false);
  const honeypot = useHoneypot();

  const { isLoading: isCheckingToken, isError: isTokenInvalid } =
    useResetPasswordToken(token);
  const { verifyOtp, isLoading: isVerifying } =
    useVerifyPasswordResetOtp(token);
  const { resetPassword, isLoading: isResetting } = useResetPassword(token);

  const form = useForm<TResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onVerify = async (otp: string) => {
    try {
      await verifyOtp(otp);
      setOtpVerified(true);
    } catch {
      toast.error(t("errors.invalidOtp"));
    }
  };

  const onReset = form.handleSubmit(async ({ newPassword }) => {
    if (honeypot.isTrapped()) return;
    try {
      await resetPassword(newPassword);
      toast.success(t("success.message"));
      navigate(`/${ROUTES.Login}`, { replace: true });
    } catch {
      toast.error(t("errors.resetFailed"));
    }
  });

  if (!token || isTokenInvalid) {
    return (
      <div className="flex w-[280px] flex-col items-center gap-y-4 text-center">
        <div className="flex flex-col gap-y-1">
          <h1 className="text-ui-fg-base text-base font-medium leading-normal">
            {t("expired.title")}
          </h1>
          <p className="txt-compact-xsmall-plus text-ui-fg-muted">
            {t("expired.description")}
          </p>
        </div>
        <Button variant="primary" className="w-full" asChild>
          <Link to={`/${ROUTES.ForgotPassword}`}>
            {t("actions.requestNew")}
          </Link>
        </Button>
      </div>
    );
  }

  if (isCheckingToken) {
    return <CircularLoading />;
  }

  return (
    <div className="flex w-[280px] flex-col items-center gap-y-4">
      <div className="flex flex-col items-center gap-y-1 text-center">
        <h1 className="text-ui-fg-base text-base font-medium leading-normal">
          {t("title")}
        </h1>
        <p className="txt-compact-xsmall-plus text-ui-fg-muted">
          {otpVerified
            ? t("description")
            : t("otp.description", { digit: OTP_DIGIT_LENGTH })}
        </p>
        {!otpVerified && email && (
          <p className="txt-compact-xsmall-plus text-ui-fg-base">{email}</p>
        )}
      </div>

      {otpVerified ? (
        <Form {...form}>
          <form
            onSubmit={onReset}
            className="relative flex w-full flex-col gap-y-4"
          >
            <HoneypotField ref={honeypot.ref} />
            <div className="flex flex-col gap-y-3">
              <Form.Field
                control={form.control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <Form.Item>
                    <Form.Control>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        autoFocus
                        errorMessage={fieldState.error?.message}
                        {...field}
                        className="bg-ui-bg-field-component"
                        placeholder={t("fields.newPassword")}
                      />
                    </Form.Control>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Form.Item>
                    <Form.Control>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        errorMessage={
                          fieldState.error?.message === "passwordMismatch"
                            ? t("errors.passwordMismatch")
                            : fieldState.error?.message
                        }
                        {...field}
                        className="bg-ui-bg-field-component"
                        placeholder={t("fields.confirmPassword")}
                      />
                    </Form.Control>
                  </Form.Item>
                )}
              />
            </div>
            <Button
              variant="primary"
              className="w-full"
              type="submit"
              isLoading={isResetting}
            >
              {t("actions.resetButton")}
            </Button>
          </form>
        </Form>
      ) : (
        <>
          <OTPInput length={OTP_DIGIT_LENGTH} onComplete={onVerify} />
          {isVerifying && (
            <p className="txt-compact-small text-ui-fg-muted">
              {t("actions.verifying")}
            </p>
          )}
        </>
      )}

      <p className="txt-compact-small text-ui-fg-muted">
        <LinkButton to={`/${ROUTES.Login}`}>
          {t("actions.backToLogin")}
        </LinkButton>
      </p>
    </div>
  );
}

export { ResetPasswordPage };
