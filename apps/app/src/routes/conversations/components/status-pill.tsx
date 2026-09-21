import { StatusBadge } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";

type Color = "green" | "orange" | "grey" | "red" | "blue" | "purple";

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
  const { t } = useTranslation();
  const state = resolveState(conversation);
  return (
    <StatusBadge color={COLOR_BY_STATE[state]}>
      {t(`conversations.status.${state}`)}
    </StatusBadge>
  );
};
