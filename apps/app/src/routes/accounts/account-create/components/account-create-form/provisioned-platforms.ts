/** The two channels eccho issues itself, rather than authorizing against a platform. */
export const PROVISIONED_PLATFORMS = ["API_CHANNEL", "WEBSITE_WIDGET"] as const;

export type ProvisionedPlatform = (typeof PROVISIONED_PLATFORMS)[number];

export function isProvisionedPlatform(
  platform: string,
): platform is ProvisionedPlatform {
  return (PROVISIONED_PLATFORMS as readonly string[]).includes(platform);
}

/** What the server minted, shown once on the wizard's final step. */
export type Issued =
  | { kind: "API_CHANNEL"; accountKey: string; signingSecret: string }
  | { kind: "WEBSITE_WIDGET"; widgetKey: string };
