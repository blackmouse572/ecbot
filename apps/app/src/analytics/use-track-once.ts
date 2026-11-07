import { useEffect } from "react";
import { analytics } from "./analytics";
import type { AnalyticsEventName, AnalyticsEvents } from "./analytics-events";

/**
 * Captures a "viewed" event once per signed-in session for each `key`, when
 * `event` is set. Pass `null` to skip (the screen is not showing yet).
 * Logout (`analytics.reset`) starts over.
 */
export function useTrackOnce<E extends AnalyticsEventName>(
  event: E | null,
  properties: AnalyticsEvents[E],
  key: string,
) {
  const id = event ? `${event}:${key}` : null;
  useEffect(() => {
    if (event && id) analytics.captureOnce(id, event, properties);
    // Once per id: a re-render with equal props must not capture again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}
