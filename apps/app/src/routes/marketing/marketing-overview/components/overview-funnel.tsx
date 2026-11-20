import {
  CHANNELS,
  channelOf,
} from "@/components/platform-icon/channel-catalog";
import type { MarketingOverviewResponseDto } from "@/hooks/api/marketing-overview";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { Container, Heading, Text } from "@medusajs/ui";
import { FunnelChart } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useStageLabel } from "../../components/stage-label";

type OverviewFunnelProps = {
  overview?: MarketingOverviewResponseDto;
  isLoading: boolean;
};

/** Customers who reached each stage, one band per first channel. */
export const OverviewFunnel: FC<OverviewFunnelProps> = ({
  overview,
  isLoading,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const label = useStageLabel();
  const stages = (overview?.stages ?? []).map((s) => ({
    key: s.stage,
    label: label(s.stage),
  }));
  // A page and an account of the same platform share a band, in the
  // catalog's order.
  const funnel = overview?.funnel ?? [];
  const series = CHANNELS.flatMap((channel) => {
    const rows = funnel.filter((row) => channelOf(row.platform) === channel);
    if (rows.length === 0) return [];
    return [
      {
        key: channel.key,
        label: channel.label,
        color: channel.color,
        icon: channel.icon,
        counts: stages.map((stage) =>
          rows.reduce(
            (sum, row) =>
              sum + (row.stages.find((s) => s.stage === stage.key)?.count ?? 0),
            0,
          ),
        ),
      },
    ];
  });

  return (
    <Container className="flex flex-col gap-y-4">
      <div>
        <Heading level="h2">{t("marketing.overview.funnel.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("marketing.overview.funnel.description", {
            value: f.number(overview?.total ?? 0),
          })}
        </Text>
      </div>
      <FunnelChart
        stages={stages}
        series={series}
        emptyLabel={t("marketing.overview.funnel.empty")}
        isLoading={isLoading}
        formatCount={f.number}
        formatShare={f.share}
        dropLabel={(lost, share) =>
          t("marketing.overview.funnel.dropped", {
            value: f.number(lost),
            share,
          })
        }
      />
    </Container>
  );
};
