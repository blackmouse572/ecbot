// Series colours from the design tokens, so charts follow light and dark mode.
export const CHART_COLORS = {
  primary: "var(--bg-interactive)",
  good: "var(--tag-green-icon)",
  warn: "var(--tag-orange-icon)",
  bad: "var(--tag-red-icon)",
  neutral: "var(--tag-neutral-icon)",
} as const;

// One colour per tag slice; the last one is "other tags".
export const TAG_SLICE_COLORS = [
  "var(--tag-blue-icon)",
  "var(--tag-green-icon)",
  "var(--tag-purple-icon)",
  "var(--tag-orange-icon)",
  "var(--tag-red-icon)",
  "var(--tag-neutral-icon)",
] as const;
