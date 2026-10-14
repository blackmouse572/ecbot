import type { ComponentType } from "react";

// Enterprise overlay: `src/ee/` is gitignored in the public repo and materialised
// only by the enterprise build. Vite resolves the glob at transform time, with
// no match it is `{}` and nothing here reaches the bundle. One
// `dashboard-alert.tsx` per enterprise module, default-exporting the component
// to render at the top of the dashboard (it decides for itself whether to show).
const modules = import.meta.glob<{ default: ComponentType }>(
  "../ee/**/dashboard-alert.tsx",
  { eager: true },
);

// Built once at module load from the eagerly-globbed modules; every call
// returns the same array reference, so callers must not mutate it.
const alerts: ComponentType[] = Object.keys(modules)
  .sort()
  .map((key) => modules[key].default);

export function enterpriseDashboardAlerts(): ComponentType[] {
  return alerts;
}
