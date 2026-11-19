import { useWorkspaceAnalytics } from "@/hooks/api/workspace-analytics";
import { StatCard } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const BOT_TAB = ["bot" as const];

type Props = { chatbotId: string };

/**
 * The agent's last 7 days from the dashboard's bot analytics. An agent with
 * no conversations has no row there, so it reads as zero.
 */
export const ChatbotStatsSection: FC<Props> = ({ chatbotId }) => {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useWorkspaceAnalytics("7d", BOT_TAB);
  const row = data.bot?.byChatbot.find((r) => r.id === chatbotId);
  const number = new Intl.NumberFormat(i18n.language);
  const percent = (v: number) => `${number.format(v)}%`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label={t("chatbot.details.stats.conversations")}
        current={data.bot ? (row?.conversations ?? 0) : undefined}
        format={(v) => number.format(v)}
        isLoading={isLoading}
      />
      <StatCard
        label={t("chatbot.details.stats.botResolved")}
        current={data.bot ? (row?.botResolvedRate ?? 0) : undefined}
        format={percent}
        isLoading={isLoading}
      />
      <StatCard
        label={t("chatbot.details.stats.handedOver")}
        current={data.bot ? (row?.handoffRate ?? 0) : undefined}
        format={percent}
        isLoading={isLoading}
      />
    </div>
  );
};
