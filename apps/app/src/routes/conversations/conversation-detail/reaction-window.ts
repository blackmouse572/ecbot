// Meta's Messenger & Instagram Messaging APIs only allow a business to send a
// message — a reaction included — within the 24-hour "standard messaging
// window" opened by the customer's last inbound message. Outside it, the
// reaction POST is rejected by policy (issue #248), so we disable the
// affordance client-side. Other platforms (Telegram, Zalo) have no such window.
const META_ACCOUNT_TYPES = new Set([
  "FACEBOOK_PAGE",
  "FACEBOOK_ACCOUNT",
  "INSTAGRAM_PAGE",
  "INSTAGRAM_ACCOUNT",
]);

export const REACTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const POLICY_URL =
  "https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy";

export const isMetaPlatform = (accountType?: string | null): boolean =>
  !!accountType && META_ACCOUNT_TYPES.has(accountType);

/**
 * Whether operator reactions are blocked by Meta's 24h messaging policy.
 * `true` only for Meta conversations whose window has closed — i.e. the last
 * inbound message is older than 24h, or there is no inbound message at all.
 * Always `false` for non-Meta platforms.
 */
export const isReactionWindowClosed = (
  accountType: string | null | undefined,
  messages: { direction: "INBOUND" | "OUTBOUND"; dateSent: string }[],
  now: number,
): boolean => {
  if (!isMetaPlatform(accountType)) return false;

  let lastInboundAt: number | undefined;
  for (const m of messages) {
    if (m.direction === "INBOUND") {
      lastInboundAt = new Date(m.dateSent).getTime();
    }
  }

  if (lastInboundAt === undefined) return true;
  return now - lastInboundAt > REACTION_WINDOW_MS;
};
