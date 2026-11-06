import type { AnalyticsProperties } from "./analytics-events";

/**
 * What an enterprise overlay provides from `src/ee/**\/analytics.ts`
 * (default export). The open edition ships none, so every call below is a
 * no-op there.
 */
export interface AnalyticsAdapter {
  boot(): void;
  /** The signed-in user's id only: no email or name from core. */
  identify(userId: string): void;
  group(workspaceId: string): void;
  reset(): void;
  capture(event: string, properties: AnalyticsProperties): void;
}
