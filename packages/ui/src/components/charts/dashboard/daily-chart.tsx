import { Container, Heading, Tabs, Text } from "@medusajs/ui";
import { useState, type ReactNode } from "react";
import { EvilBarChart } from "../evilcharts/recharts-bar-chart";
import type { ChartConfig } from "../evilcharts/recharts-chart";

export type DailySeries<T> = {
  key: keyof T & string;
  label: string;
  color: string;
};

export type DailyView<T> = {
  value: string;
  label: string;
  series: DailySeries<T>[];
  /** "stacked" piles the series; "percent" shows each day as 100%. */
  stackType?: "default" | "stacked" | "percent";
};

type DailyChartProps<T extends { day: string }> = {
  title: string;
  rows: T[];
  /** What the card can show, one at a time behind a toggle. */
  views: [DailyView<T>, ...DailyView<T>[]];
  /** Shown when there are no rows. */
  emptyLabel: string;
  formatValue?: (value: number) => string;
  /** Extra content under the heading, e.g. a note on what is counted. */
  description?: ReactNode;
  isLoading?: boolean;
};

/** Daily bars with a legend, one view at a time, on the EvilCharts bar chart. */
export function DailyChart<T extends { day: string }>({
  title,
  rows,
  views,
  emptyLabel,
  formatValue = String,
  description,
  isLoading,
}: DailyChartProps<T>) {
  const [value, setValue] = useState(views[0].value);
  const view = views.find((v) => v.value === value) ?? views[0];
  const config = Object.fromEntries(
    view.series.map((s) => [
      s.key,
      { label: s.label, colors: { light: [s.color] } },
    ]),
  ) as ChartConfig;

  const pending = !!isLoading && !rows.length;
  const empty = !isLoading && !rows.length;

  return (
    <Container className="flex flex-col gap-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Heading level="h2">{title}</Heading>
          {description && (
            <Text size="small" className="text-ui-fg-subtle">
              {description}
            </Text>
          )}
        </div>
        {views.length > 1 && (
          <Tabs value={view.value} onValueChange={setValue}>
            <Tabs.List>
              {views.map((v) => (
                <Tabs.Trigger key={v.value} value={v.value}>
                  {v.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>
        )}
      </div>
      {empty ? (
        <div className="flex h-56 items-center justify-center">
          <Text size="small" className="text-ui-fg-muted">
            {emptyLabel}
          </Text>
        </div>
      ) : (
        <EvilBarChart
          // A new view is a new set of bars; remount so it animates in.
          key={view.value}
          data={rows as Record<string, unknown>[]}
          config={config}
          isLoading={pending}
          stackType={view.stackType}
          // Fixed height; `flex-none` stops this column-flex card collapsing it.
          className="aspect-auto h-56 w-full flex-none"
          barRadius={3}
          animationType="left-to-right"
        >
          <EvilBarChart.Grid vertical={false} />
          <EvilBarChart.XAxis
            dataKey="day"
            tickFormatter={(day: string) => day.slice(5)}
          />
          <EvilBarChart.YAxis
            tickFormatter={(v: number) =>
              view.stackType === "percent"
                ? `${Math.round(v * 100)}%`
                : formatValue(v)
            }
          />
          <EvilBarChart.Tooltip />
          <EvilBarChart.Legend />
          {view.series.map((s) => (
            <EvilBarChart.Bar key={s.key} dataKey={s.key} />
          ))}
        </EvilBarChart>
      )}
    </Container>
  );
}
