import { useMe, useUpdateNotificationSettings } from "@/hooks/api";
import { Container, Heading, Label, Switch, Text, toast } from "@medusajs/ui";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** The user's own email-notification choices. */
export const PreferenceNotificationSection = () => {
  const { t } = useTranslation();
  const id = useId();
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
    </Container>
  );
};
