import { useEffect } from "react";
import { analytics } from "./analytics";
import type { AnalyticsEventName, AnalyticsEvents } from "./analytics-events";

const seen = new Set<string>();

/**
 * Captures a "viewed" event once per page load for each `key`, when `event`
 * is set. Pass `null` to skip (the screen is not showing yet).
 */
export function useTrackOnce<E extends AnalyticsEventName>(
  event: E | null,
  properties: AnalyticsEvents[E],
  key: string,
) {
  const id = event ? `${event}:${key}` : null;
  useEffect(() => {
    if (!event || !id || seen.has(id)) return;
    seen.add(id);
    analytics.capture(event, properties);
    // Once per id: a re-render with equal props must not capture again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}
