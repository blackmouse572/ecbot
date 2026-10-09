import { readApiError } from "@/libs/api-error";
import { Button, Input, Label, Text, toast } from "@medusajs/ui";
import { useId, useState, type FC, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

type MfaCredentialsFormProps = {
  description: string;
  submitLabel: string;
  /** Also ask for an authenticator or recovery code. */
  withCode?: boolean;
  danger?: boolean;
  isPending: boolean;
  onSubmit: (body: { password: string; code: string }) => Promise<void>;
  onCancel: () => void;
};

/** The current password (and a code) that every MFA change asks for. */
export const MfaCredentialsForm: FC<MfaCredentialsFormProps> = ({
  description,
  submitLabel,
  withCode = false,
  danger = false,
  isPending,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation(undefined, { keyPrefix: "profile.mfa" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const passwordId = useId();
  const codeId = useId();
  const incomplete = !password || (withCode && !code.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isPending || incomplete) return;
    try {
      await onSubmit({ password, code: code.trim() });
    } catch (error) {
      toast.error(readApiError(error).message ?? t("errors.generic"));
      setCode("");
    }
  };

  return (
    <form className="flex flex-col gap-y-4 px-6 py-4" onSubmit={submit}>
      <Text size="small" className="text-ui-fg-subtle">
        {description}
      </Text>
      <div className="flex flex-col gap-y-1">
        <Label htmlFor={passwordId} size="small" weight="plus">
          {t("credentials.password")}
        </Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {withCode && (
        <div className="flex flex-col gap-y-1">
          <Label htmlFor={codeId} size="small" weight="plus">
            {t("credentials.code")}
          </Label>
          <Input
            id={codeId}
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
      )}
      <div className="flex justify-end gap-x-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("actions.cancel")}
        </Button>
        <Button
          type="submit"
          variant={danger ? "danger" : "primary"}
          size="small"
          isLoading={isPending}
          disabled={isPending || incomplete}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
