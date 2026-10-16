import { useAbility } from "@repo/auth";
import type { AnalyticsTab } from "@/hooks/api/workspace-analytics";
import { ANALYTICS_TABS } from "../constants";

/** The analytics tabs this member may see: each needs read on every subject
 * it counts, so a role never sees numbers it cannot open. */
export function useAnalyticsTabs(): AnalyticsTab[] {
  const ability = useAbility();
  return ANALYTICS_TABS.filter((tab) =>
    tab.subjects.every((subject) => ability.can("read", subject)),
  ).map((tab) => tab.value);
}
