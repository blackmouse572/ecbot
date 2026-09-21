import { describe, expect, it } from "vitest";
import { isReactionWindowClosed } from "./reaction-window";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-01-02T00:00:00Z").getTime();

const inbound = (iso: string) => ({
  direction: "INBOUND" as const,
  dateSent: iso,
});
const outbound = (iso: string) => ({
  direction: "OUTBOUND" as const,
  dateSent: iso,
});

describe("isReactionWindowClosed", () => {
  it("closes the window for a Meta conversation whose last inbound message is older than 24h", () => {
    const messages = [inbound(new Date(now - 25 * HOUR).toISOString())];
    expect(isReactionWindowClosed("FACEBOOK_PAGE", messages, now)).toBe(true);
  });

  it("keeps the window open when the last inbound message is within 24h", () => {
    const messages = [inbound(new Date(now - 23 * HOUR).toISOString())];
    expect(isReactionWindowClosed("FACEBOOK_PAGE", messages, now)).toBe(false);
  });

  it("uses the most recent inbound message, ignoring later outbound ones", () => {
    const messages = [
      inbound(new Date(now - 2 * HOUR).toISOString()),
      outbound(new Date(now - 1 * HOUR).toISOString()),
    ];
    expect(isReactionWindowClosed("FACEBOOK_PAGE", messages, now)).toBe(false);
  });

  it("never closes the window for non-Meta platforms", () => {
    const messages = [inbound(new Date(now - 100 * HOUR).toISOString())];
    expect(isReactionWindowClosed("TELEGRAM_BOT", messages, now)).toBe(false);
    expect(isReactionWindowClosed("ZALO_PAGE", messages, now)).toBe(false);
  });

  it("treats a Meta conversation with no inbound message as window-closed", () => {
    const messages = [outbound(new Date(now - 1 * HOUR).toISOString())];
    expect(isReactionWindowClosed("FACEBOOK_PAGE", messages, now)).toBe(true);
  });
});
