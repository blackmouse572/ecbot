import type {
  AnalyticsTab,
  WorkspaceAnalytics,
} from "@/hooks/api/workspace-analytics";
import { StatCard } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useAnalyticsFormat } from "./use-analytics-format";

type AnalyticsKpisProps = {
  data?: WorkspaceAnalytics;
  /** Tabs this member may see; a number shows only with its tab. */
  tabs: AnalyticsTab[];
  isLoading: boolean;
};

const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
};

/** One headline number per tab, each against the period before. */
export const AnalyticsKpis: FC<AnalyticsKpisProps> = ({
  data,
  tabs,
  isLoading,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const cards = [
    {
      key: "conversionRate",
      tab: "conversion",
      value: data?.conversion?.conversionRate,
      lowerIsBetter: false,
    },
    {
      key: "positiveRate",
      tab: "marketing",
      value: data?.marketing?.positiveRate,
      lowerIsBetter: false,
    },
    {
      key: "handoffRate",
      tab: "bot",
      value: data?.bot?.handoffRate,
      lowerIsBetter: true,
    },
  ].filter(
    (card) =>
      tabs.includes(card.tab as AnalyticsTab) &&
      (isLoading || card.value !== undefined),
  );

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${GRID_COLS[cards.length]}`}>
      {cards.map((card) => (
        <StatCard
          key={card.key}
          label={t(`dashboard.analytics.kpi.${card.key}`)}
          current={card.value?.current}
          previous={card.value?.previous}
          format={f.percent}
          lowerIsBetter={card.lowerIsBetter}
          isLoading={isLoading}
          hint={t("dashboard.analytics.kpi.previous", {
            value: card.value ? f.percent(card.value.previous) : "–",
          })}
        />
      ))}
    </div>
  );
};
