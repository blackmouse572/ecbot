import type { ComponentType } from "react";

/** List pages that show an enterprise alert above their table. */
export type EnterpriseAlertPage = "members" | "customers";

// Enterprise overlay, like `enterprise.dashboard-alert.ts`: one
// `page-alerts.tsx` per enterprise module, exporting a component per page
// (e.g. `members`, `customers`) that decides for itself whether to show.
// Without the overlay the glob is `{}` and every page gets no alerts.
const modules = import.meta.glob<
  Partial<Record<EnterpriseAlertPage, ComponentType>>
>("../ee/**/page-alerts.tsx", { eager: true });

const byPage = (page: EnterpriseAlertPage): ComponentType[] =>
  Object.keys(modules)
    .sort()
    .flatMap((key) => modules[key][page] ?? []);

// Built once at module load; callers must not mutate the arrays.
const alerts: Record<EnterpriseAlertPage, ComponentType[]> = {
  members: byPage("members"),
  customers: byPage("customers"),
};

export function enterprisePageAlerts(
  page: EnterpriseAlertPage,
): ComponentType[] {
  return alerts[page];
}
