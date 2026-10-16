import {
  CHANNELS,
  channelOf,
} from "@/components/platform-icon/channel-catalog";
import type { ConversionAnalytics } from "@/hooks/api/workspace-analytics";
import { Container, Heading, Text } from "@medusajs/ui";
import { DailyChart, FunnelChart } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ChannelCell } from "./channel-cell";
import { CHART_COLORS } from "./chart-colors";
import { SimpleTable } from "./simple-table";
import { useAnalyticsFormat } from "./use-analytics-format";

/** New customers becoming customers with an order: daily, funnel, per channel. */
export const ConversionSection: FC<{ data: ConversionAnalytics }> = ({
  data,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const empty = t("dashboard.analytics.empty");
  const stageKeys = ["newCustomers", "engaged", "hotLeads", "orders"] as const;
  const stages = stageKeys.map((key) => ({
    key,
    label: t(
      `dashboard.analytics.conversion.funnel.${key === "orders" ? "ordered" : key}`,
    ),
  }));
  // One band per channel the workspace has data for, in the catalog's order;
  // a page and an account of the same platform share a band.
  const series = CHANNELS.flatMap((channel) => {
    const rows = data.byChannel.filter(
      (row) => channelOf(row.platform) === channel,
    );
    if (rows.length === 0) return [];
    return [
      {
        key: channel.key,
        label: channel.label,
        color: channel.color,
        counts: stageKeys.map((key) =>
          rows.reduce((sum, row) => sum + row[key], 0),
        ),
      },
    ];
  });

  return (
    <div className="flex flex-col gap-y-3">
      <DailyChart
        title={t("dashboard.analytics.conversion.dailyTitle")}
        rows={data.daily}
        emptyLabel={empty}
        formatValue={f.compact}
        views={[
          {
            value: "all",
            label: "",
            series: [
              {
                key: "newCustomers",
                label: t("dashboard.analytics.conversion.newCustomers"),
                color: CHART_COLORS.primary,
              },
              {
                key: "orders",
                label: t("dashboard.analytics.conversion.orders"),
                color: CHART_COLORS.good,
              },
            ],
          },
        ]}
      />
      <Container className="flex flex-col gap-y-4">
        <div>
          <Heading level="h2">
            {t("dashboard.analytics.conversion.funnelTitle")}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dashboard.analytics.conversion.funnelHint")}
          </Text>
        </div>
        <FunnelChart
          stages={stages}
          series={series}
          emptyLabel={empty}
          formatCount={f.number}
          formatShare={f.share}
          dropLabel={(lost, share) =>
            t("dashboard.analytics.conversion.dropped", {
              count: lost,
              value: f.number(lost),
              share,
            })
          }
        />
        <div className="bg-ui-bg-subtle flex flex-wrap items-baseline justify-between gap-2 rounded-md px-3 py-2">
          <Text size="small" weight="plus">
            {t("dashboard.analytics.conversion.timeToOrder")}
          </Text>
          <Text size="small" weight="plus" className="tabular-nums">
            {t("dashboard.analytics.conversion.hours", {
              value: f.decimal(data.medianHoursToOrder),
            })}
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle w-full">
            {t("dashboard.analytics.conversion.timeToOrderHint", {
              value: f.decimal(data.medianHoursToOrder),
            })}
          </Text>
        </div>
      </Container>
      <SimpleTable
        title={t("dashboard.analytics.conversion.byChannelTitle")}
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
            key: "orders",
            header: t("dashboard.analytics.conversion.orders"),
            numeric: true,
            cell: (row) => f.number(row.orders),
          },
          {
            key: "newCustomers",
            header: t("dashboard.analytics.conversion.newCustomers"),
            numeric: true,
            cell: (row) => f.number(row.newCustomers),
          },
          {
            key: "rate",
            header: t("dashboard.analytics.kpi.conversionRate"),
            numeric: true,
            cell: (row) => f.share(row.orders, row.newCustomers),
          },
          {
            key: "tokens",
            header: t("dashboard.analytics.kpi.tokensPerOrder"),
            numeric: true,
            cell: (row) =>
              row.tokensPerOrder === undefined
                ? "–"
                : f.compact(row.tokensPerOrder),
          },
        ]}
      />
    </div>
  );
};
