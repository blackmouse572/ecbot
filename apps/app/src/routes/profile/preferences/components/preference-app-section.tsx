import { isIos, useInstallPrompt } from "@/modules/pwa";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

/** Install Ecbot as an app on this device (needed for push on iPhone). */
export const PreferenceAppSection = () => {
  const { t } = useTranslation();
  const { canInstall, isInstalled, install } = useInstallPrompt();

  const status = isInstalled
    ? t("preferences.app.installed")
    : isIos()
      ? t("preferences.app.iosSteps")
      : canInstall
        ? null
        : t("preferences.app.browserMenu");

  return (
    <Container>
      <div className="px-6 py-4">
        <Heading>{t("preferences.app.domain")}</Heading>
        <Text>{t("preferences.app.description")}</Text>
      </div>
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        {status ? (
          <Text size="small" className="text-ui-fg-subtle">
            {status}
          </Text>
        ) : (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              {t("preferences.app.installHint")}
            </Text>
            <Button size="small" variant="secondary" onClick={install}>
              {t("preferences.app.install")}
            </Button>
          </>
        )}
      </div>
    </Container>
  );
};
