import { useMfaSetup, type AuthMfaSetupResponseDto } from "@/hooks/api/mfa";
import { readApiError } from "@/libs/api-error";
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { MfaDisableForm } from "./mfa-disable-form";
import { MfaRecoveryCodes } from "./mfa-recovery-codes";
import { MfaSetupPanel } from "./mfa-setup-panel";
import type { ProfileGeneralSectionProps } from "./profile-general-section";

type Step =
  | { name: "idle" }
  | { name: "setup"; setup: AuthMfaSetupResponseDto }
  | { name: "recovery"; codes: string[] }
  | { name: "disable" };

export const ProfileMfaSection: FC<ProfileGeneralSectionProps> = ({ user }) => {
  const { t } = useTranslation(undefined, { keyPrefix: "profile.mfa" });
  const { mutateAsync: startSetup, isPending: isStarting } = useMfaSetup();
  const [step, setStep] = useState<Step>({ name: "idle" });
  // Read loosely until `pnpm generate:client` adds the field to the DTO.
  const enabled = (user as { mfaEnabled?: boolean }).mfaEnabled === true;
  const toIdle = () => setStep({ name: "idle" });

  const onEnable = async () => {
    try {
      setStep({ name: "setup", setup: await startSetup() });
    } catch (error) {
      toast.error(readApiError(error).message ?? t("errors.generic"));
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div>
          <div className="flex items-center gap-x-2">
            <Heading>{t("domain")}</Heading>
            <Badge size="2xsmall" color={enabled ? "green" : "grey"}>
              {enabled ? t("status.on") : t("status.off")}
            </Badge>
          </div>
          <Text className="text-ui-fg-subtle" size="small">
            {t("description")}
          </Text>
        </div>
        {step.name === "idle" &&
          (enabled ? (
            <Button
              variant="secondary"
              onClick={() => setStep({ name: "disable" })}
            >
              {t("actions.disable")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={onEnable}
              isLoading={isStarting}
              disabled={isStarting}
            >
              {t("actions.enable")}
            </Button>
          ))}
      </div>

      {step.name === "setup" && (
        <MfaSetupPanel
          setup={step.setup}
          onEnabled={(codes) => setStep({ name: "recovery", codes })}
          onCancel={toIdle}
        />
      )}
      {step.name === "recovery" && (
        <MfaRecoveryCodes codes={step.codes} onDone={toIdle} />
      )}
      {step.name === "disable" && (
        <MfaDisableForm onDisabled={toIdle} onCancel={toIdle} />
      )}
    </Container>
  );
};
