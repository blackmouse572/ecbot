import type { CustomersAnalytics } from "@/hooks/api/workspace-analytics";
import { DailyChart } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ChannelCell } from "./channel-cell";
import { CHART_COLORS } from "./chart-colors";
import { SimpleTable } from "./simple-table";
import { useAnalyticsFormat } from "./use-analytics-format";

/** New against returning customers, and where customers come from. */
export const CustomersSection: FC<{ data: CustomersAnalytics }> = ({
  data,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const empty = t("dashboard.analytics.empty");

  return (
    <div className="flex flex-col gap-y-3">
      <DailyChart
        title={t("dashboard.analytics.customers.dailyTitle")}
        rows={data.daily}
        emptyLabel={empty}
        formatValue={f.compact}
        views={[
          {
            value: "all",
            label: "",
            stackType: "stacked",
            series: [
              {
                key: "newCustomers",
                label: t("dashboard.analytics.conversion.newCustomers"),
                color: CHART_COLORS.primary,
              },
              {
                key: "returning",
                label: t("dashboard.analytics.customers.returning"),
                color: CHART_COLORS.good,
              },
            ],
          },
        ]}
      />
      <SimpleTable
        title={t("dashboard.analytics.customers.byChannelTitle")}
        rows={data.byChannel}
        rowKey={(row) => row.platform}
        emptyLabel={empty}
        columns={[
          {
            key: "channel",
            header: t("dashboard.analytics.columns.channel"),
            cell: (row) => <ChannelCell platform={row.platform} />,
          },
          {
            key: "count",
            header: t("dashboard.analytics.columns.customers"),
            numeric: true,
            cell: (row) => f.number(row.count),
          },
          {
            key: "share",
            header: t("dashboard.analytics.columns.share"),
            numeric: true,
            cell: (row) => f.share(row.count, data.total),
          },
        ]}
      />
    </div>
  );
};
