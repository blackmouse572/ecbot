import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** Tells the owner which agent actions the dashboard test chat cannot run. */
export const TestChatNotice: FC = () => {
  const { t } = useTranslation();
  return (
    <Text size="xsmall" className="text-ui-fg-subtle">
      {t("chatbot.chat.liveOnlyNotice")}
    </Text>
  );
};
