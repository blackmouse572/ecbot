import { ANALYTICS_RANGES } from "@/hooks/api/workspace-analytics";
import type {
  AnalyticsRange,
  AnalyticsTab,
} from "@/hooks/api/workspace-analytics";
import { useSearchParams } from "react-router-dom";

const DEFAULT_RANGE: AnalyticsRange = "30d";

/**
 * The range and tab live in the URL, so a shared link opens the same view.
 * An unknown or forbidden tab falls back to the first allowed one.
 */
export function useAnalyticsParams(allowed: AnalyticsTab[]) {
  const [params, setParams] = useSearchParams();
  const rawRange = params.get("range") as AnalyticsRange | null;
  const range =
    rawRange && ANALYTICS_RANGES.includes(rawRange) ? rawRange : DEFAULT_RANGE;
  const rawTab = params.get("tab") as AnalyticsTab | null;
  const tab = rawTab && allowed.includes(rawTab) ? rawTab : allowed[0];

  const set = (key: "range" | "tab", value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, value);
        return next;
      },
      { replace: true },
    );

  return {
    range,
    tab,
    setRange: (value: AnalyticsRange) => set("range", value),
    setTab: (value: AnalyticsTab) => set("tab", value),
  };
}
