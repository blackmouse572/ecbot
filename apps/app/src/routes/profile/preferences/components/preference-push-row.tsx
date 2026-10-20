import { usePushNotifications } from "@/modules/pwa";
import { Label, Switch, Text, toast } from "@medusajs/ui";
import { useId } from "react";
import { useTranslation } from "react-i18next";

const HINT_KEYS = {
  ready: "preferences.notifications.pushHint",
  "needs-install": "preferences.notifications.pushNeedsInstall",
  denied: "preferences.notifications.pushDenied",
  unsupported: "preferences.notifications.pushUnsupported",
} as const;

/** Push on this browser or installed app; each device is switched on its own. */
export const PreferencePushRow = () => {
  const { t } = useTranslation();
  const id = useId();
  const { status, enabled, isPending, enable, disable } =
    usePushNotifications();

  // No push key on the server (or still loading): nothing to switch.
  if (status === "off" || status === "loading") return null;

  const onChange = async (checked: boolean) => {
    try {
      await (checked ? enable() : disable());
    } catch {
      toast.error(t("preferences.notifications.pushFailed"));
    }
  };

  return (
    <div className="flex items-center justify-between gap-x-4 px-6 py-4">
      <div className="flex flex-col gap-y-1">
        <Label htmlFor={id} size="small" weight="plus">
          {t("preferences.notifications.push")}
        </Label>
        <Text size="small" className="text-ui-fg-subtle">
          {t(HINT_KEYS[status])}
        </Text>
      </div>
      <Switch
        id={id}
        checked={enabled}
        disabled={isPending || status !== "ready"}
        onCheckedChange={onChange}
      />
    </div>
  );
};
