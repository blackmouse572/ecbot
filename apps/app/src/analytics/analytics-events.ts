import type { AccountGetDetailResponseDto } from "@repo/client";

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

type AccountType = AccountGetDetailResponseDto["type"];

/**
 * A channel as the server's product events name it: the account type,
 * lowercased (`facebook_account`). Client and server use the same values, so
 * `channel_connect_started` joins `channel_connect_succeeded` on `channel`.
 * A Record, so a new account type fails the type check until it is added.
 */
const CHANNELS: Record<Lowercase<AccountType>, true> = {
  facebook_account: true,
  facebook_page: true,
  instagram_account: true,
  instagram_page: true,
  zalo_account: true,
  zalo_page: true,
  tiktok_shop: true,
  shopee_shop: true,
  telegram_bot: true,
  whatsapp_business: true,
  threads_account: true,
  website_widget: true,
  api_channel: true,
};
export type AnalyticsChannel = keyof typeof CHANNELS | "unknown";

/** The analytics channel of a platform / account type, e.g. `ZALO_ACCOUNT`. */
export function analyticsChannel(platform: string): AnalyticsChannel {
  const channel = platform.toLowerCase();
  return channel in CHANNELS ? (channel as AnalyticsChannel) : "unknown";
}

/**
 * An interface, not a type, so an enterprise overlay can add its own events
 * with declaration merging.
 */
export interface AnalyticsEvents {
  onboarding_step_viewed: { step: OnboardingStep };
  playground_message_sent: { turn_index: number };
  channel_connect_started: { channel: AnalyticsChannel };
  channel_connect_failed: {
    channel: AnalyticsChannel;
    step: "auth";
    reason: ClientConnectFailureReason;
  };
  knowledge_failed_seen: { kind?: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
export type AnalyticsProperties = Record<string, string | number | boolean>;
