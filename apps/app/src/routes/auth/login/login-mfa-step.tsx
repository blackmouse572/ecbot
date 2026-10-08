import { useLoginWithMfa } from "@/hooks/api/mfa";
import { readApiError } from "@/libs/api-error";
import { Button, Input, toast } from "@medusajs/ui";
import { OTPInput } from "@repo/ui/common-components";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  LOGIN_MFA_CODE_LENGTH,
  LOGIN_MFA_RESTART_STATUS_CODES,
  TOO_MANY_REQUESTS_STATUS,
} from "../constants";

type LoginMfaStepProps = {
  mfaToken: string;
  onSuccess: (accessToken: string) => void;
  /** Back to the password step, e.g. after the challenge expired. */
  onRestart: () => void;
};

const LoginMfaStep: FC<LoginMfaStepProps> = ({
  mfaToken,
  onSuccess,
  onRestart,
}) => {
  const { t } = useTranslation(undefined, { keyPrefix: "app.auth.login.mfa" });
  const { mutateAsync, isPending } = useLoginWithMfa();
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (isPending || !trimmed) return;
    if (!useRecovery && trimmed.length < LOGIN_MFA_CODE_LENGTH) return;

    try {
      const data = await mutateAsync({ mfaToken, code: trimmed });
      onSuccess(data.accessToken);
    } catch (error) {
      const { status, message } = readApiError(error);
      const statusCode = (
        error as { response?: { data?: { statusCode?: number } } }
      )?.response?.data?.statusCode;
      toast.error(
        status === TOO_MANY_REQUESTS_STATUS
          ? t("errors.tooManyAttempts")
          : (message ?? t("errors.invalidCode")),
      );
      setCode("");
      if (statusCode && LOGIN_MFA_RESTART_STATUS_CODES.includes(statusCode)) {
        onRestart();
      }
    }
  };

  const toggleMode = () => {
    setUseRecovery((current) => !current);
    setCode("");
  };

  return (
    <div className="flex w-[280px] flex-col gap-y-4">
      <div className="flex flex-col items-center gap-y-1 text-center">
        <h1 className="text-ui-fg-base text-base font-bold leading-normal">
          {t("title")}
        </h1>
        <p className="txt-compact-xsmall-plus text-ui-fg-muted">
          {useRecovery ? t("recoveryDescription") : t("description")}
        </p>
      </div>

      {useRecovery ? (
        <Input
          autoFocus
          autoComplete="one-time-code"
          placeholder={t("recoveryPlaceholder")}
          aria-label={t("recoveryPlaceholder")}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit(code);
          }}
        />
      ) : (
        <div className="flex justify-center">
          <OTPInput
            length={LOGIN_MFA_CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={submit}
          />
        </div>
      )}

      <Button
        className="w-full"
        isLoading={isPending}
        disabled={isPending}
        onClick={() => submit(code)}
      >
        {t("verifyButton")}
      </Button>

      <div className="flex flex-col items-center gap-y-1">
        <Button
          variant="transparent"
          size="small"
          onClick={toggleMode}
          disabled={isPending}
        >
          {useRecovery ? t("useAuthenticator") : t("useRecoveryCode")}
        </Button>
        <Button
          variant="transparent"
          size="small"
          className="text-ui-fg-muted"
          onClick={onRestart}
          disabled={isPending}
        >
          {t("back")}
        </Button>
      </div>
    </div>
  );
};

export { LoginMfaStep };
