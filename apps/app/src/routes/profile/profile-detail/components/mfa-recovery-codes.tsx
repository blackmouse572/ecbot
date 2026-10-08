import { Button, Copy, Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type MfaRecoveryCodesProps = {
  codes: string[];
  onDone: () => void;
};

export const MfaRecoveryCodes: FC<MfaRecoveryCodesProps> = ({
  codes,
  onDone,
}) => {
  const { t } = useTranslation(undefined, { keyPrefix: "profile.mfa" });

  return (
    <div className="flex flex-col gap-y-4 px-6 py-4">
      <div>
        <Heading level="h3">{t("recovery.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("recovery.description")}
        </Text>
      </div>
      <ul className="bg-ui-bg-subtle grid grid-cols-2 gap-2 rounded-md px-3 py-2 font-mono">
        {codes.map((code) => (
          <li key={code} className="txt-compact-small">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-x-2">
        <Copy content={codes.join("\n")} asChild>
          <Button variant="secondary" size="small">
            {t("recovery.copyAll")}
          </Button>
        </Copy>
        <Button size="small" onClick={onDone}>
          {t("actions.done")}
        </Button>
      </div>
    </div>
  );
};
