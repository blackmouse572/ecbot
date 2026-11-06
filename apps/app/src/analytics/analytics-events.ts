/**
 * The product events the dashboard itself reports. Vendor-neutral: core only
 * names the events, an enterprise adapter (if any) decides where they go.
 * Properties are ids, enums and counts, never text a person typed.
 */

/** Onboarding screens, named after the real steps (agent builder groups). */
export const ONBOARDING_STEPS = [
  "welcome",
  "identity",
  "essence",
  "facts",
  "moreFacts",
  "process",
  "rules",
  "interaction",
  "channels",
  "activation",
  "test_panel",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Why the sign-in popup of a channel did not hand back a code. */
export const CLIENT_CONNECT_FAILURE_REASONS = [
  "popup_blocked",
  "auth_denied",
  "invalid_state",
  "unsupported",
] as const;
export type ClientConnectFailureReason =
  (typeof CLIENT_CONNECT_FAILURE_REASONS)[number];

/**
 * An interface, not a type, so an enterprise overlay can add its own events
 * with declaration merging.
 */
export interface AnalyticsEvents {
  onboarding_step_viewed: { step: OnboardingStep };
  playground_message_sent: { turn_index: number };
  channel_connect_started: { channel: string };
  channel_connect_failed: {
    channel: string;
    step: "auth";
    reason: ClientConnectFailureReason;
  };
  knowledge_failed_seen: { kind?: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
export type AnalyticsProperties = Record<string, string | number | boolean>;
