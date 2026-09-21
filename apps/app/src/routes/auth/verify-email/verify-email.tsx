import { useResendEmailOtp, useVerifyEmailOtp } from "@/hooks/api";
import { ROUTES } from "@/routes/constants";
import { Button, toast } from "@medusajs/ui";
import { VerifyEmailForm } from "@repo/auth/components";
import { LinkButton } from "@repo/ui/common-components";
import { useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

const I18N_PREFIX = "app.auth.verifyEmail";

const OTP_DIGIT_LENGTH = 6; // Default length for OTP input

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const { t } = useTranslation(undefined, {
    keyPrefix: I18N_PREFIX,
  });
  const { verifyEmail, isLoading } = useVerifyEmailOtp(email, userId);
  const { resendEmailOtp, isLoading: isResending } = useResendEmailOtp(
    email,
    userId,
  );
  const verifyEmailFormRef =
    useRef<React.ComponentRef<typeof VerifyEmailForm>>(null);

  const onVerify = async (otp: string) => {
    if (!email || !userId || !otp || otp.length < OTP_DIGIT_LENGTH) return;
    verifyEmail(otp, {
      onError: () => {
        toast.error(t("errors.invalidOtp"));
      },
      onSuccess: () => {
        toast.success(t("success.message"));
        navigate(`/${ROUTES.Login}`, {
          replace: true,
        });
      },
    });
  };

  const resendOTP = async () => {
    if (!email || !userId) return;
    await resendEmailOtp(undefined, {
      onError: () => {
        toast.error(t("errors.resendOtpFailed"));
      },
      onSuccess: () => {
        toast.success(t("success.resendOtp"));
      },
    });
  };

  return (
    <div className="flex flex-col gap-y-6 w-[400px] items-center">
      <h3 className="text-lg font-medium">{t("title")}</h3>
      <span className="text-sm flex flex-col items-center">
        <span>{t("description", { digit: OTP_DIGIT_LENGTH })}</span>
        <span className="text-ui-fg-muted font-medium">{email}</span>
      </span>
      <VerifyEmailForm
        ref={verifyEmailFormRef}
        length={OTP_DIGIT_LENGTH}
        email={email}
      />
      <Button
        className="w-full"
        onClick={() => {
          const formValue = verifyEmailFormRef.current?.submit() ?? { otp: "" };
          onVerify(formValue.otp);
        }}
      >
        {t("actions.verifyButton")}
      </Button>
      <div className="text-xs text-ui-fg-muted">
        <Trans
          i18nKey={`${I18N_PREFIX}.actions.resendOtp`}
          components={[
            <LinkButton
              className="cursor-pointer"
              disabled={isLoading || isResending || !email || !userId}
              onClick={resendOTP}
            />,
          ]}
        />
      </div>
    </div>
  );
};

export { VerifyEmailPage };
