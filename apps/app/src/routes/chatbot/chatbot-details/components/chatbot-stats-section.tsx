import { useWorkspaceAnalytics } from "@/hooks/api/workspace-analytics";
import { StatCard } from "@repo/ui/charts";
import type { AnalyticsBotChatbotCountsDto } from "@repo/client";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const BOT_TAB = ["bot" as const];

type Props = { chatbotId: string };

type Metric = "conversations" | "botResolvedRate" | "handoffRate";

/**
 * The agent's last 7 days from the dashboard's bot analytics, against the 7
 * days before. An agent with no conversations in a week has no row for it,
 * so that week reads as zero.
 */
export const ChatbotStatsSection: FC<Props> = ({ chatbotId }) => {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useWorkspaceAnalytics("7d", BOT_TAB);
  const number = new Intl.NumberFormat(i18n.language);
  const count = (v: number) => number.format(v);
  const percent = (v: number) => `${number.format(v)}%`;

  // Undefined while loading, or (for last week) from a response cached
  // before the API sent it.
  const valueIn = (
    rows: AnalyticsBotChatbotCountsDto[] | undefined,
    key: Metric,
  ) => (rows ? (rows.find((r) => r.id === chatbotId)?.[key] ?? 0) : undefined);

  const card = (
    label: string,
    key: Metric,
    format: (v: number) => string,
    lowerIsBetter?: boolean,
  ) => {
    const previous = valueIn(data.bot?.byChatbotPrevious, key);

    return (
      <StatCard
        label={t(label)}
        current={valueIn(data.bot?.byChatbot, key)}
        previous={previous}
        format={format}
        lowerIsBetter={lowerIsBetter}
        hint={
          previous !== undefined &&
          t("chatbot.details.stats.lastWeek", { value: format(previous) })
        }
        isLoading={isLoading}
      />
    );
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {card("chatbot.details.stats.conversations", "conversations", count)}
      {card("chatbot.details.stats.botResolved", "botResolvedRate", percent)}
      {card("chatbot.details.stats.handedOver", "handoffRate", percent, true)}
    </div>
  );
};
