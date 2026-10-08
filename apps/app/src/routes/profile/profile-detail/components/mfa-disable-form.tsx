import { useMfaDisable } from "@/hooks/api/mfa";
import { readApiError } from "@/libs/api-error";
import { Button, Input, Label, Text, toast } from "@medusajs/ui";
import { useId, useState, type FC, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

type MfaDisableFormProps = {
  onDisabled: () => void;
  onCancel: () => void;
};

export const MfaDisableForm: FC<MfaDisableFormProps> = ({
  onDisabled,
  onCancel,
}) => {
  const { t } = useTranslation(undefined, { keyPrefix: "profile.mfa" });
  const { mutateAsync, isPending } = useMfaDisable();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const passwordId = useId();
  const codeId = useId();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isPending || !password || !code.trim()) return;
    try {
      await mutateAsync({ password, code: code.trim() });
      toast.success(t("success.disabled"));
      onDisabled();
    } catch (error) {
      toast.error(readApiError(error).message ?? t("errors.generic"));
      setCode("");
    }
  };

  return (
    <form className="flex flex-col gap-y-4 px-6 py-4" onSubmit={onSubmit}>
      <Text size="small" className="text-ui-fg-subtle">
        {t("disable.description")}
      </Text>
      <div className="flex flex-col gap-y-1">
        <Label htmlFor={passwordId} size="small" weight="plus">
          {t("disable.password")}
        </Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label htmlFor={codeId} size="small" weight="plus">
          {t("disable.code")}
        </Label>
        <Input
          id={codeId}
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </div>
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
          variant="danger"
          size="small"
          isLoading={isPending}
          disabled={isPending || !password || !code.trim()}
        >
          {t("actions.disable")}
        </Button>
      </div>
    </form>
  );
};
