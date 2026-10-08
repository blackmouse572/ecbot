import { useMfaEnable, type AuthMfaSetupResponseDto } from "@/hooks/api/mfa";
import { readApiError } from "@/libs/api-error";
import { LOGIN_MFA_CODE_LENGTH } from "@/routes/auth/constants";
import { Button, Text, toast } from "@medusajs/ui";
import { OTPInput } from "@repo/ui/common-components";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { MfaSecretRow } from "./mfa-secret-row";

type MfaSetupPanelProps = {
  setup: AuthMfaSetupResponseDto;
  onEnabled: (recoveryCodes: string[]) => void;
  onCancel: () => void;
};

export const MfaSetupPanel: FC<MfaSetupPanelProps> = ({
  setup,
  onEnabled,
  onCancel,
}) => {
  const { t } = useTranslation(undefined, { keyPrefix: "profile.mfa" });
  const { mutateAsync, isPending } = useMfaEnable();
  const [code, setCode] = useState("");

  const confirm = async (value: string) => {
    if (isPending || value.length < LOGIN_MFA_CODE_LENGTH) return;
    try {
      const { recoveryCodes } = await mutateAsync(value);
      toast.success(t("success.enabled"));
      onEnabled(recoveryCodes);
    } catch (error) {
      toast.error(readApiError(error).message ?? t("errors.generic"));
      setCode("");
    }
  };

  return (
    <div className="flex flex-col gap-y-4 px-6 py-4">
      <Text size="small" className="text-ui-fg-subtle">
        {t("setup.scan")}
      </Text>
      <MfaSecretRow label={t("setup.secretLabel")} value={setup.secret} />
      <MfaSecretRow label={t("setup.uriLabel")} value={setup.otpauthUri} />
      <Text size="small" className="text-ui-fg-subtle">
        {t("setup.enterCode")}
      </Text>
      <OTPInput
        length={LOGIN_MFA_CODE_LENGTH}
        value={code}
        onChange={setCode}
        onComplete={confirm}
      />
      <div className="flex justify-end gap-x-2">
        <Button
          variant="secondary"
          size="small"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("actions.cancel")}
        </Button>
        <Button
          size="small"
          onClick={() => confirm(code)}
          isLoading={isPending}
          disabled={isPending}
        >
          {t("actions.confirm")}
        </Button>
      </div>
    </div>
  );
};
