import type { MarketingOverviewResponseDto } from "@/hooks/api/marketing-overview";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { Container, Heading } from "@medusajs/ui";
import { FunnelChart } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useStageLabel } from "../../components/stage-label";
import { funnelSeries } from "../../utils";

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
  const series = funnelSeries(
    overview?.funnel ?? [],
    stages.map((stage) => stage.key),
  ).map(({ channel, counts }) => ({
    key: channel.key,
    label: channel.label,
    color: channel.color,
    icon: channel.icon,
    counts,
  }));

  return (
    <Container className="flex flex-col gap-y-4">
      <Heading level="h2">{t("marketing.overview.funnel.title")}</Heading>
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
