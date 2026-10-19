import { ChartPie } from "@medusajs/icons";
import { ChartPlaceholder } from "./chart-placeholder";
import { TOOLTIP_CLASS } from "./tooltip-class";
import { Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { type ChartConfig } from "../evilcharts/recharts-chart";
import { EvilPieChart } from "../evilcharts/recharts-pie-chart";

export type ShareSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
  icon?: ReactNode;
};

type SharePieProps = {
  slices: ShareSlice[];
  emptyLabel: string;
  /** One line under the empty title on what will show here. */
  emptyMessage?: string;
  formatCount?: (count: number) => string;
  /** Shown next to each count in the legend, e.g. a share of all customers. */
  suffix?: (slice: ShareSlice) => string | undefined;
  isLoading?: boolean;
};

/** A donut of how a total splits, with a legend that carries the numbers. */
export const SharePie: FC<SharePieProps> = ({
  slices,
  emptyLabel,
  emptyMessage,
  formatCount = String,
  suffix,
  isLoading,
}) => {
  if (isLoading || slices.length === 0) {
    return (
      <ChartPlaceholder
        isLoading={isLoading}
        className="h-[396px]"
        icon={<ChartPie />}
        title={emptyLabel}
        message={emptyMessage}
      />
    );
  }
  const config = Object.fromEntries(
    slices.map((s) => [
      s.key,
      { label: s.label, colors: { light: [s.color] } },
    ]),
  ) as ChartConfig;

  return (
    <div className="@container">
      <div className="flex flex-col items-center gap-6 @md:flex-row">
        <EvilPieChart
          config={config}
          data={slices}
          dataKey="count"
          nameKey="key"
          className="aspect-square w-48 flex-none"
        >
          <EvilPieChart.Pie
            innerRadius="58%"
            outerRadius="100%"
            paddingAngle={1}
            cornerRadius={4}
          />
          <EvilPieChart.Tooltip className={TOOLTIP_CLASS} />
        </EvilPieChart>
        <ul className="flex w-full min-w-0 flex-col gap-y-2">
          {slices.map((s) => (
            <li
              key={s.key}
              className="flex items-center justify-between gap-x-3"
            >
              <span className="flex min-w-0 items-center gap-x-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                {s.icon && <span className="shrink-0">{s.icon}</span>}
                <Text size="small" className="truncate" title={s.label}>
                  {s.label}
                </Text>
              </span>
              <Text
                size="small"
                weight="plus"
                className="shrink-0 tabular-nums"
              >
                {formatCount(s.count)}
                {suffix?.(s) && (
                  <span className="text-ui-fg-muted ml-1 font-normal">
                    {suffix(s)}
                  </span>
                )}
              </Text>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
