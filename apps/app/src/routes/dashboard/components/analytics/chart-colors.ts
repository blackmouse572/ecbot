// Series colours from the shared chart palette (@repo/ui evilcharts.css),
// so charts follow light and dark mode.
export const CHART_COLORS = {
  primary: "var(--bg-interactive)",
  good: "var(--chart-2)",
  warn: "var(--chart-4)",
  bad: "var(--chart-5)",
  neutral: "var(--chart-6)",
} as const;

// One colour per tag slice; the last one is "other tags".
export const TAG_SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;
