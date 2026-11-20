import type { MarketingOverviewResponseDto } from "@/hooks/api/marketing-overview";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { Heading, Text } from "@medusajs/ui";
import { StatCard } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type OverviewHealthProps = {
  overview?: MarketingOverviewResponseDto;
  isLoading: boolean;
  /** Length of the range the comparison covers. */
  days: number;
};

/** Opt-outs and paused customers: whether the shop messages too much. */
export const OverviewHealth: FC<OverviewHealthProps> = ({
  overview,
  isLoading,
  days,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();

  return (
    <div className="flex flex-col gap-y-3">
      <div className="px-1">
        <Heading level="h2">{t("marketing.overview.health.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("marketing.overview.health.description")}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label={t("marketing.overview.health.optOuts")}
          current={overview?.health.optOuts}
          previous={overview?.health.optOutsPrevious}
          format={f.number}
          hint={t("marketing.overview.period", { days })}
          lowerIsBetter
          isLoading={isLoading}
        />
        <StatCard
          label={t("marketing.overview.health.paused")}
          current={overview?.health.paused}
          format={f.number}
          hint={t("marketing.overview.health.pausedHint")}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
