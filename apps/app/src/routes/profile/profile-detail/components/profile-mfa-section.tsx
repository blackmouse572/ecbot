import {
  useMfaDisable,
  useMfaRegenerateRecoveryCodes,
  useMfaSetup,
  type AuthMfaSetupResponseDto,
} from "@/hooks/api/mfa";
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { MfaCredentialsForm } from "./mfa-credentials-form";
import { MfaRecoveryCodes } from "./mfa-recovery-codes";
import { MfaSetupPanel } from "./mfa-setup-panel";
import type { ProfileGeneralSectionProps } from "./profile-general-section";

type Step =
  | { name: "idle" }
  | { name: "confirm-password" }
  | { name: "setup"; setup: AuthMfaSetupResponseDto; password: string }
  | { name: "recovery"; codes: string[] }
  | { name: "regenerate" }
  | { name: "disable" };

export const ProfileMfaSection: FC<ProfileGeneralSectionProps> = ({ user }) => {
  const { t } = useTranslation(undefined, { keyPrefix: "profile.mfa" });
  const setup = useMfaSetup();
  const regenerate = useMfaRegenerateRecoveryCodes();
  const disable = useMfaDisable();
  const [step, setStep] = useState<Step>({ name: "idle" });
  const enabled = user.mfaEnabled;
  const toIdle = () => setStep({ name: "idle" });

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
            <div className="flex gap-x-2">
              <Button
                variant="secondary"
                onClick={() => setStep({ name: "regenerate" })}
              >
                {t("actions.regenerate")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setStep({ name: "disable" })}
              >
                {t("actions.disable")}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setStep({ name: "confirm-password" })}
            >
              {t("actions.enable")}
            </Button>
          ))}
      </div>

      {step.name === "confirm-password" && (
        <MfaCredentialsForm
          description={t("setup.confirmPassword")}
          submitLabel={t("actions.continue")}
          isPending={setup.isPending}
          onSubmit={async ({ password }) =>
            setStep({
              name: "setup",
              setup: await setup.mutateAsync(password),
              password,
            })
          }
          onCancel={toIdle}
        />
      )}
      {step.name === "setup" && (
        <MfaSetupPanel
          setup={step.setup}
          password={step.password}
          onEnabled={(codes) => setStep({ name: "recovery", codes })}
          onCancel={toIdle}
        />
      )}
      {step.name === "recovery" && (
        <MfaRecoveryCodes codes={step.codes} onDone={toIdle} />
      )}
      {step.name === "regenerate" && (
        <MfaCredentialsForm
          description={t("regenerate.description")}
          submitLabel={t("actions.createCodes")}
          withCode
          isPending={regenerate.isPending}
          onSubmit={async (body) => {
            const { recoveryCodes } = await regenerate.mutateAsync(body);
            toast.success(t("success.regenerated"));
            setStep({ name: "recovery", codes: recoveryCodes });
          }}
          onCancel={toIdle}
        />
      )}
      {step.name === "disable" && (
        <MfaCredentialsForm
          description={t("disable.description")}
          submitLabel={t("actions.disable")}
          withCode
          danger
          isPending={disable.isPending}
          onSubmit={async (body) => {
            await disable.mutateAsync(body);
            toast.success(t("success.disabled"));
            toIdle();
          }}
          onCancel={toIdle}
        />
      )}
    </Container>
  );
};
