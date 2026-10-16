import { describe, expect, it } from "vitest";
import { CHANNELS, channelOf } from "./channel-catalog";

// Every account type the backend can emit (AccountGetDetailResponseDto["type"]).
const ALL_TYPES = [
  "FACEBOOK_ACCOUNT",
  "FACEBOOK_PAGE",
  "INSTAGRAM_ACCOUNT",
  "INSTAGRAM_PAGE",
  "ZALO_ACCOUNT",
  "ZALO_PAGE",
  "TIKTOK_SHOP",
  "SHOPEE_SHOP",
  "TELEGRAM_BOT",
  "API_CHANNEL",
  "WEBSITE_WIDGET",
  "WHATSAPP_BUSINESS",
] as const;

describe("channel catalog", () => {
  it("puts every account type in exactly one channel", () => {
    const listed = CHANNELS.flatMap((c) => c.accountTypes);
    expect([...listed].sort()).toEqual([...ALL_TYPES].sort());
  });

  it("connects each channel with one of its own account types", () => {
    for (const c of CHANNELS) expect(c.accountTypes).toContain(c.connectAs);
  });

  it("groups a page and an account of the same platform", () => {
    expect(channelOf("FACEBOOK_PAGE")).toBe(channelOf("FACEBOOK_ACCOUNT"));
    expect(channelOf("ZALO_PAGE").label).toBe("Zalo");
  });
});
