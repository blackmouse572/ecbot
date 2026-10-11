import { useMe, useUpdateNotificationSettings } from "@/hooks/api";
import { soundEnabledAtom } from "@/modules/sound";
import { Container, Heading, Label, Switch, Text, toast } from "@medusajs/ui";
import { useAtom } from "jotai";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** The user's own notification choices: emails, and the in-app sound. */
export const PreferenceNotificationSection = () => {
  const { t } = useTranslation();
  const id = useId();
  const soundId = useId();
  const [soundOn, setSoundOn] = useAtom(soundEnabledAtom);
  const { user } = useMe();
  const { updateNotifications, isPending } = useUpdateNotificationSettings();
  // Missing on an older profile response: the server default is on.
  const handoffEmails =
    (user as { handoffEmails?: boolean } | undefined)?.handoffEmails !== false;

  const onChange = async (checked: boolean) => {
    try {
      await updateNotifications({ handoffEmails: checked });
    } catch {
      toast.error(t("preferences.notifications.saveFailed"));
    }
  };

  return (
    <Container>
      <div className="px-6 py-4">
        <Heading>{t("preferences.notifications.domain")}</Heading>
        <Text>{t("preferences.notifications.description")}</Text>
      </div>
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor={id} size="small" weight="plus">
            {t("preferences.notifications.handoffEmails")}
          </Label>
          <Text size="small" className="text-ui-fg-subtle">
            {t("preferences.notifications.handoffEmailsHint")}
          </Text>
        </div>
        <Switch
          id={id}
          checked={handoffEmails}
          disabled={isPending}
          onCheckedChange={onChange}
        />
      </div>
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor={soundId} size="small" weight="plus">
            {t("preferences.notifications.sound")}
          </Label>
          <Text size="small" className="text-ui-fg-subtle">
            {t("preferences.notifications.soundHint")}
          </Text>
        </div>
        <Switch id={soundId} checked={soundOn} onCheckedChange={setSoundOn} />
      </div>
    </Container>
  );
};
