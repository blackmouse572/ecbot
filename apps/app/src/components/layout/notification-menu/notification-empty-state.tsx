import { BellAlertDone } from "@medusajs/icons";
import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const NotificationEmptyState: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-y-2 px-6 py-8 text-center">
      <div className="bg-ui-bg-component flex size-10 items-center justify-center rounded-full">
        <BellAlertDone className="text-ui-fg-muted" />
      </div>
      <Text size="small" weight="plus">
        {t("app.menus.notifications.empty")}
      </Text>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t("app.menus.notifications.emptyHint")}
      </Text>
    </div>
  );
};
