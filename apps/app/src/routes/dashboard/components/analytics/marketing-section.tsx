import type { MarketingAnalytics } from "@/hooks/api/workspace-analytics";
import { DailyChart } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ChannelCell } from "./channel-cell";
import { CHART_COLORS } from "./chart-colors";
import { SimpleTable } from "./simple-table";
import { useAnalyticsFormat } from "./use-analytics-format";

/** How conversations ended, by the tags the classifier left: daily and per channel. */
export const MarketingSection: FC<{
  data: MarketingAnalytics;
  isLoading?: boolean;
}> = ({ data, isLoading }) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const empty = t("dashboard.analytics.empty");
  const series = [
    {
      key: "positive" as const,
      label: t("dashboard.analytics.marketing.positive"),
      color: CHART_COLORS.good,
    },
    {
      key: "negative" as const,
      label: t("dashboard.analytics.marketing.negative"),
      color: CHART_COLORS.warn,
    },
    {
      key: "complaint" as const,
      label: t("dashboard.analytics.marketing.complaint"),
      color: CHART_COLORS.bad,
    },
  ];

  return (
    <div className="flex flex-col gap-y-3">
      <DailyChart
        title={t("dashboard.analytics.marketing.dailyTitle")}
        description={t("dashboard.analytics.marketing.dailyHint")}
        rows={data.daily}
        emptyLabel={empty}
        emptyMessage={t("dashboard.analytics.emptyMessage")}
        isLoading={isLoading}
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
      <SimpleTable
        title={t("dashboard.analytics.marketing.byChannelTitle")}
        rows={data.byChannel}
        rowKey={(row) => row.platform}
        emptyLabel={empty}
        emptyMessage={t("dashboard.analytics.emptyMessage")}
        isLoading={isLoading}
        columns={[
          {
            key: "channel",
            header: t("dashboard.analytics.columns.channel"),
            cell: (row) => <ChannelCell platform={row.platform} />,
          },
          {
            key: "conversations",
            header: t("dashboard.analytics.columns.conversations"),
            numeric: true,
            cell: (row) => f.number(row.conversations),
          },
          {
            key: "positive",
            header: t("dashboard.analytics.marketing.positive"),
            numeric: true,
            cell: (row) => f.percent(row.positive),
          },
          {
            key: "negative",
            header: t("dashboard.analytics.marketing.negative"),
            numeric: true,
            cell: (row) => f.percent(row.negative),
          },
        ]}
      />
    </div>
  );
};
