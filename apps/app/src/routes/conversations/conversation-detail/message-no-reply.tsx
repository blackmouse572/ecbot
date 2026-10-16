import { Sparkle2Solid } from "@medusajs/icons";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** Under a customer message the bot chose not to answer (an ok sticker
 *  after its answer), with the few words it gave staff on why. */
export const MessageNoReply: FC<{ reason?: string }> = ({ reason }) => {
  const { t } = useTranslation();
  return (
    <p className="txt-compact-xsmall text-ui-fg-muted flex items-center gap-1">
      <Sparkle2Solid />
      <span>{t("conversations.noReply.label")}</span>
      {reason && (
        <>
          <span aria-hidden>·</span>
          <span>{reason}</span>
        </>
      )}
    </p>
  );
};
