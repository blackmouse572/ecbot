import type { BotAnalytics } from "@/hooks/api/workspace-analytics";
import { Container, Heading } from "@medusajs/ui";
import { DailyChart, RankedRows } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { CHART_COLORS } from "./chart-colors";
import { SimpleTable } from "./simple-table";
import { useAnalyticsFormat } from "./use-analytics-format";

/** What the bot finished alone and what it handed over, and why. */
export const BotSection: FC<{ data: BotAnalytics }> = ({ data }) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const empty = t("dashboard.analytics.empty");
  const series = [
    {
      key: "botResolved" as const,
      label: t("dashboard.analytics.bot.botResolved"),
      color: CHART_COLORS.primary,
    },
    {
      key: "handedOver" as const,
      label: t("dashboard.analytics.bot.handedOver"),
      color: CHART_COLORS.warn,
    },
  ];
  // A tag reason shows the workspace's own tag; the others are fixed causes.
  const reasons = data.reasons.map((r) => ({
    key: r.key,
    count: r.count,
    icon: r.emoji,
    label: r.tagName ?? t(`dashboard.analytics.bot.reasons.${r.key}`),
  }));

  return (
    <div className="flex flex-col gap-y-3">
      <DailyChart
        title={t("dashboard.analytics.bot.dailyTitle")}
        rows={data.daily}
        emptyLabel={empty}
        formatValue={f.compact}
        views={[
          {
            value: "share",
            label: t("dashboard.analytics.views.share"),
            series,
            stackType: "percent",
          },
          {
            value: "count",
            label: t("dashboard.analytics.views.count"),
            series,
            stackType: "stacked",
          },
        ]}
      />
      <Container className="flex flex-col gap-y-3">
        <Heading level="h2">
          {t("dashboard.analytics.bot.reasonsTitle")}
        </Heading>
        <RankedRows rows={reasons} emptyLabel={empty} formatCount={f.number} />
      </Container>
      <SimpleTable
        title={t("dashboard.analytics.bot.byChatbotTitle")}
        rows={data.byChatbot}
        rowKey={(row) => row.id}
        emptyLabel={empty}
        columns={[
          {
            key: "name",
            header: t("dashboard.analytics.columns.agent"),
            cell: (row) => row.name,
          },
          {
            key: "conversations",
            header: t("dashboard.analytics.columns.conversations"),
            numeric: true,
            cell: (row) => f.number(row.conversations),
          },
          {
            key: "botResolved",
            header: t("dashboard.analytics.bot.botResolved"),
            numeric: true,
            cell: (row) => f.percent(row.botResolvedRate),
          },
          {
            key: "handoff",
            header: t("dashboard.analytics.kpi.handoffRate"),
            numeric: true,
            cell: (row) => f.percent(row.handoffRate),
          },
          {
            key: "firstReply",
            header: t("dashboard.analytics.bot.firstReply"),
            numeric: true,
            cell: (row) =>
              t("dashboard.analytics.bot.seconds", {
                value: f.number(row.firstReplySeconds),
              }),
          },
          {
            key: "toolErrors",
            header: t("dashboard.analytics.bot.toolErrors"),
            numeric: true,
            cell: (row) => f.percent(row.toolErrorRate),
          },
        ]}
      />
    </div>
  );
};
