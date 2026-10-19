// Chart components built on recharts 3. EvilCharts is vendored under
// ./evilcharts — see the header of each file for provenance.
export { EvilBarChart, useLoadingData } from "./evilcharts/recharts-bar-chart";
export { EvilPieChart } from "./evilcharts/recharts-pie-chart";
export type { ChartConfig as EvilChartConfig } from "./evilcharts/recharts-chart";

// Dashboard cards shared by the app and the admin dashboards.
export { DailyChart } from "./dashboard/daily-chart";
export type { DailySeries, DailyView } from "./dashboard/daily-chart";
export { deltaPercent } from "./dashboard/delta-percent";
export { FunnelChart } from "./dashboard/funnel-chart";
export type { FunnelSeries, FunnelStage } from "./dashboard/funnel-chart";
export { RankedList, RankedRows } from "./dashboard/ranked-list";
export type { RankedRow } from "./dashboard/ranked-list";
export { SharePie } from "./dashboard/share-pie";
export type { ShareSlice } from "./dashboard/share-pie";
export { StatCard } from "./dashboard/stat-card";
export { TabbedCard } from "./dashboard/tabbed-card";
export { ChartPlaceholder } from "./dashboard/chart-placeholder";
