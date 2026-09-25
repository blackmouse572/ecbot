/** What the server minted for an eccho-issued channel, shown once. */
export type Issued =
  | { kind: "API_CHANNEL"; accountKey: string; signingSecret: string }
  | { kind: "WEBSITE_WIDGET"; widgetKey: string };
