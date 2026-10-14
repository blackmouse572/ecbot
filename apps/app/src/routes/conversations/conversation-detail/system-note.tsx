import { CheckCircleSolid } from "@medusajs/icons";
import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** The note left when staff hand a conversation back to the bot (resolve, or
 *  switch the bot on). Its stored text is written for the bot, so the
 *  timeline shows its own label instead. */
export const SystemNote: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-x-3 py-1" role="note">
      <div className="bg-ui-border-base h-px flex-1" />
      <div className="text-ui-fg-muted flex items-center gap-x-1.5">
        <CheckCircleSolid className="shrink-0" />
        <Text size="xsmall" leading="compact">
          {t("conversations.systemNote.handled")}
        </Text>
      </div>
      <div className="bg-ui-border-base h-px flex-1" />
    </div>
  );
};
