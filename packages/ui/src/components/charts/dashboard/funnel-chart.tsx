import { ChartActivity } from "@medusajs/icons";
import { ChartPlaceholder } from "./chart-placeholder";
import { TOOLTIP_CLASS } from "./tooltip-class";
import { clx, Text } from "@medusajs/ui";
import { useId, useState, type FC } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "../evilcharts/recharts-chart";

export type FunnelStage = { key: string; label: string };

/** One band of the funnel, e.g. a channel: its count at every stage. */
export type FunnelSeries = {
  key: string;
  label: string;
  color: string;
  /** Logo URL, shown in place of the colour dot in the legend and tooltip. */
  icon?: string;
  counts: number[];
};

type FunnelChartProps = {
  /** In order; the first stage is 100%. */
  stages: FunnelStage[];
  series: FunnelSeries[];
  emptyLabel: string;
  /** One line under the empty title on what will show here. */
  emptyMessage?: string;
  formatCount?: (count: number) => string;
  /** A share as text, e.g. "72%". */
  formatShare: (count: number, of: number) => string;
  /** Read out for the drop between two stages, e.g. "119 stopped (28%)". */
  dropLabel: (lost: number, share: string) => string;
  isLoading?: boolean;
};

// Each stage holds flat across the middle of its column and curves into the
// next one near the column edge.
const PLATEAU = [0.3, 0.7];

/** A flowing funnel: stacked bands per series, centred, with each stage's share
 * of the first on top and the drop between stages below. The biggest drop is
 * marked red. The legend turns series on and off, and the shares follow.
 * Hovering or focusing a stage column shows each series' count there. */
export const FunnelChart: FC<FunnelChartProps> = ({
  stages,
  series,
  emptyLabel,
  emptyMessage,
  formatCount = String,
  formatShare,
  dropLabel,
  isLoading,
}) => {
  const [hidden, setHidden] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const baseId = useId();
  const shown = series.filter((s) => !hidden.includes(s.key));
  const toggle = (key: string) =>
    setHidden((keys) =>
      keys.includes(key)
        ? keys.filter((k) => k !== key)
        : // Keep at least one series on.
          shown.length > 1
          ? [...keys, key]
          : keys,
    );
  const totals = stages.map((_, i) =>
    shown.reduce((sum, s) => sum + (s.counts[i] ?? 0), 0),
  );
  const first = totals[0] ?? 0;
  if (isLoading || !first) {
    return (
      <ChartPlaceholder
        isLoading={isLoading}
        className="h-[340px]"
        icon={<ChartActivity />}
        title={emptyLabel}
        message={emptyMessage}
      />
    );
  }

  const n = stages.length;
  const point = (x: number, i: number) => ({
    x,
    ...Object.fromEntries(shown.map((s) => [s.key, s.counts[i] ?? 0])),
  });
  const rows = [
    point(0, 0),
    ...stages.flatMap((_, i) => PLATEAU.map((p) => point(i + p, i))),
    point(n, n - 1),
  ];
  const config = Object.fromEntries(
    shown.map((s) => [s.key, { label: s.label, colors: { light: [s.color] } }]),
  ) as ChartConfig;

  const drops = totals.slice(1).map((count, i) => {
    const prev = totals[i] ?? 0;
    return { lost: prev - count, rate: prev ? (prev - count) / prev : 0, prev };
  });
  const worst = drops.reduce(
    (best, d, i) => (d.rate > (drops[best]?.rate ?? -1) ? i : best),
    0,
  );
  const at = (i: number) => ({ left: `${(i / n) * 100}%` });
  const tipId = `${baseId}-stage`;
  const dropText = (d?: (typeof drops)[number]) =>
    d && dropLabel(d.lost, formatShare(d.lost, d.prev));

  return (
    <div className="flex flex-col gap-y-3">
      <div className="relative">
        {drops.map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={clx(
              "absolute inset-y-0 w-px -translate-x-1/2",
              i === worst ? "bg-ui-tag-red-icon" : "bg-ui-border-base",
            )}
            style={at(i + 1)}
          />
        ))}
        <ol
          className="grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {stages.map((stage, i) => (
            <li key={stage.key} className="flex flex-col px-2 pb-2">
              <Text
                size="xsmall"
                className="text-ui-fg-subtle line-clamp-2 min-h-8"
              >
                {stage.label}
              </Text>
              <Text size="large" weight="plus" className="tabular-nums">
                {formatShare(totals[i] ?? 0, first)}
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted tabular-nums">
                {formatCount(totals[i] ?? 0)}
              </Text>
            </li>
          ))}
        </ol>
        <ChartContainer config={config} className="aspect-auto h-44">
          <AreaChart
            data={rows}
            stackOffset="silhouette"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis type="number" dataKey="x" domain={[0, n]} hide />
            <YAxis hide domain={[-first / 2, first / 2]} />
            {shown.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                stackId="funnel"
                type="monotone"
                fill={`var(--color-${s.key}-0)`}
                fillOpacity={0.85}
                stroke="var(--bg-base)"
                strokeWidth={1}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ChartContainer>
        <div className="relative h-10">
          {drops.map((d, i) => {
            const share = formatShare(d.lost, d.prev);
            return (
              <div
                key={i}
                className="absolute top-1 flex -translate-x-1/2 flex-col items-center bg-ui-bg-base px-1"
                style={at(i + 1)}
              >
                <Text
                  size="small"
                  weight="plus"
                  className={clx(
                    "tabular-nums",
                    i === worst ? "text-ui-fg-error" : "text-ui-fg-subtle",
                  )}
                >
                  -{share}
                </Text>
                <span className="sr-only">{dropLabel(d.lost, share)}</span>
              </div>
            );
          })}
        </div>
        {/* Above the bands so the whole column, header to drop, is the target. */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {stages.map((stage, i) => (
            <div
              key={stage.key}
              role="group"
              tabIndex={0}
              aria-label={stage.label}
              aria-describedby={active === i ? tipId : undefined}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="focus-visible:shadow-borders-focus relative rounded-md outline-none"
            >
              {active === i && (
                <StageTooltip
                  id={tipId}
                  label={stage.label}
                  rows={shown.map((s) => ({
                    key: s.key,
                    label: s.label,
                    color: s.color,
                    icon: s.icon,
                    count: formatCount(s.counts[i] ?? 0),
                    share:
                      i > 0
                        ? formatShare(s.counts[i] ?? 0, s.counts[0] ?? 0)
                        : undefined,
                  }))}
                  drop={dropText(drops[i - 1])}
                  align={i === 0 ? "start" : i === n - 1 ? "end" : "center"}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-1 gap-y-1">
        {series.map((s) => {
          const on = !hidden.includes(s.key);
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.key)}
                className={clx(
                  "hover:bg-ui-bg-base-hover flex items-center gap-x-1.5 rounded-md px-2 py-1 transition-opacity",
                  !on && "opacity-40",
                )}
              >
                <SeriesMark color={s.color} icon={s.icon} size="size-4" />
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {s.label}
                </Text>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type StageTooltipProps = {
  id: string;
  label: string;
  rows: {
    key: string;
    label: string;
    color: string;
    icon?: string;
    count: string;
    /** Share of this series' first stage; left out on the first stage. */
    share?: string;
  }[];
  /** The drop from the previous stage, read out in full. */
  drop?: string;
  align: "start" | "center" | "end";
};

const StageTooltip: FC<StageTooltipProps> = ({
  id,
  label,
  rows,
  drop,
  align,
}) => (
  <div
    id={id}
    role="tooltip"
    className={clx(
      TOOLTIP_CLASS,
      "pointer-events-none absolute top-20 z-10 flex w-52 flex-col gap-y-1.5 rounded-lg px-3 py-2",
      align === "start" && "left-1",
      align === "end" && "right-1",
      align === "center" && "left-1/2 -translate-x-1/2",
    )}
  >
    <Text size="xsmall" weight="plus">
      {label}
    </Text>
    <ul className="flex flex-col gap-y-1">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-x-2">
          <SeriesMark color={row.color} icon={row.icon} size="size-3.5" />
          <Text size="xsmall" className="text-ui-fg-subtle flex-1 truncate">
            {row.label}
          </Text>
          <Text size="xsmall" weight="plus" className="tabular-nums">
            {row.count}
          </Text>
          {row.share && (
            <Text
              size="xsmall"
              className="text-ui-fg-muted w-9 text-right tabular-nums"
            >
              {row.share}
            </Text>
          )}
        </li>
      ))}
    </ul>
    {drop && (
      <Text
        size="xsmall"
        className="text-ui-fg-subtle border-ui-border-base border-t pt-1.5"
      >
        {drop}
      </Text>
    )}
  </div>
);

/** A series' logo when it has one, else its colour as a dot. */
const SeriesMark: FC<{ color: string; icon?: string; size: string }> = ({
  color,
  icon,
  size,
}) =>
  icon ? (
    <img src={icon} alt="" className={clx(size, "shrink-0 object-contain")} />
  ) : (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
