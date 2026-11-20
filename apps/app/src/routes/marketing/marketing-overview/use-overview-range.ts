import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
} from "@/hooks/api/workspace-analytics";
import { useSearchParams } from "react-router-dom";

const DEFAULT_RANGE: AnalyticsRange = "7d";

/** The range lives in the URL, so a shared link opens the same view. */
export function useOverviewRange() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("range") as AnalyticsRange | null;
  const range = raw && ANALYTICS_RANGES.includes(raw) ? raw : DEFAULT_RANGE;

  const setRange = (value: AnalyticsRange) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("range", value);
        return next;
      },
      { replace: true },
    );

  return { range, days: Number.parseInt(range, 10), setRange };
}
