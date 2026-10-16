import { StatusBadge, Tooltip } from "@medusajs/ui";
import { Trans, useTranslation } from "react-i18next";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import { docsUrl } from "@/libs/docs-url";

type Color = "green" | "orange" | "grey" | "red" | "blue" | "purple";

// Long enough that sweeping the pointer down the list stays quiet.
const TOOLTIP_DELAY_MS = 2000;

type DisplayState = "botActive" | "needsYou" | "youHandling" | "resolved";

const COLOR_BY_STATE: Record<DisplayState, Color> = {
  botActive: "green",
  needsYou: "orange",
  youHandling: "blue",
  resolved: "grey",
};

const resolveState = (
  conversation: ConversationGetResponseDto,
): DisplayState => {
  if (conversation.status === "RESOLVED") return "resolved";
  if ((conversation as A).botEnabled !== false) return "botActive";
  // Bot is off: escalations (handoffAt set) are urgent; manual takeovers are quiet
  return (conversation as A).handoffAt ? "needsYou" : "youHandling";
};

export const StatusPill = ({
  conversation,
}: {
  conversation: ConversationGetResponseDto;
}) => {
  const { t, i18n } = useTranslation();
  const state = resolveState(conversation);
  return (
    <Tooltip
      maxWidth={260}
      delayDuration={TOOLTIP_DELAY_MS}
      content={
        <span className="flex flex-col gap-y-1">
          <span>{t(`conversations.status.hint.${state}`)}</span>
          {(state === "needsYou" || state === "youHandling") && (
            <span>
              <Trans
                i18nKey="conversations.status.resolveTip"
                components={{ b: <b className="font-semibold" /> }}
              />
            </span>
          )}
          <a
            href={docsUrl("customers#conversation-statuses", i18n.language)}
            target="_blank"
            rel="noreferrer"
            // The tooltip is portalled, but React still bubbles the click to the list row.
            onClick={(e) => e.stopPropagation()}
            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
          >
            {t("conversations.status.learnMore")}
          </a>
        </span>
      }
    >
      <StatusBadge color={COLOR_BY_STATE[state]}>
        {t(`conversations.status.${state}`)}
      </StatusBadge>
    </Tooltip>
  );
};
