import type {
  AnalyticsTab,
  UsageAnalytics,
  WorkspaceAnalytics,
} from "@/hooks/api/workspace-analytics";
import { StatCard } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useAnalyticsFormat } from "./use-analytics-format";
import { UsageStat } from "./usage-stat";

type AnalyticsKpisProps = {
  data?: WorkspaceAnalytics;
  /** Tabs this member may see; a number shows only with its tab. */
  tabs: AnalyticsTab[];
  isLoading: boolean;
  /** Plan credits, shown as the last stat where the edition meters them. */
  usage?: UsageAnalytics;
};

const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

/** The four headline numbers, each against the period before. */
export const AnalyticsKpis: FC<AnalyticsKpisProps> = ({
  data,
  tabs,
  isLoading,
  usage,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const kpis = data?.kpis;
  const cards = [
    {
      key: "conversionRate",
      tab: "conversion",
      value: kpis?.conversionRate,
      format: f.percent,
    },
    {
      key: "positiveRate",
      tab: "marketing",
      value: kpis?.positiveRate,
      format: f.percent,
    },
    {
      key: "handoffRate",
      tab: "bot",
      value: kpis?.handoffRate,
      format: f.percent,
      lowerIsBetter: true,
    },
    {
      key: "tokensPerOrder",
      tab: "usage",
      value: kpis?.tokensPerOrder,
      format: f.compact,
      lowerIsBetter: true,
    },
  ].filter(
    (card) =>
      tabs.includes(card.tab as AnalyticsTab) &&
      (isLoading || card.value !== undefined),
  );

  const count = cards.length + (usage ? 1 : 0);
  if (count === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${GRID_COLS[count]}`}>
      {cards.map((card) => (
        <StatCard
          key={card.key}
          label={t(`dashboard.analytics.kpi.${card.key}`)}
          current={card.value?.current}
          previous={card.value?.previous}
          format={card.format}
          lowerIsBetter={card.lowerIsBetter}
          isLoading={isLoading}
          hint={t("dashboard.analytics.kpi.previous", {
            value: card.value ? card.format(card.value.previous) : "–",
          })}
        />
      ))}
      {usage && <UsageStat data={usage} />}
    </div>
  );
};
