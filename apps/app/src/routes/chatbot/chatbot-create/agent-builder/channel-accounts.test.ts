import type { ChannelId } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import { CHANNEL_CONNECT, channelOfAccountType } from "./channel-accounts";

describe("CHANNEL_CONNECT", () => {
  it("maps messenger and zalo to oauth platforms", () => {
    expect(CHANNEL_CONNECT.messenger).toEqual({ kind: "oauth", platform: "FACEBOOK_ACCOUNT" });
    expect(CHANNEL_CONNECT.zalo).toEqual({ kind: "oauth", platform: "ZALO_ACCOUNT" });
  });

  it("maps telegram to a token connect and website to a widget", () => {
    expect(CHANNEL_CONNECT.telegram).toEqual({ kind: "token", platform: "TELEGRAM_BOT" });
    expect(CHANNEL_CONNECT.website).toEqual({ kind: "widget" });
  });

  it("marks instagram, tiktok and shopee as coming soon", () => {
    expect(CHANNEL_CONNECT.instagram).toEqual({ kind: "comingSoon" });
    expect(CHANNEL_CONNECT.tiktok).toEqual({ kind: "comingSoon" });
    expect(CHANNEL_CONNECT.shopee).toEqual({ kind: "comingSoon" });
  });

  it("has an entry for every channel id", () => {
    const channels: ChannelId[] = ["messenger", "instagram", "zalo", "tiktok", "shopee", "website", "telegram"];
    for (const id of channels) expect(CHANNEL_CONNECT[id]).toBeDefined();
  });
});

describe("channelOfAccountType", () => {
  it("maps facebook account types to messenger", () => {
    expect(channelOfAccountType("FACEBOOK_ACCOUNT")).toBe("messenger");
    expect(channelOfAccountType("FACEBOOK_PAGE")).toBe("messenger");
  });

  it("maps zalo account types to zalo", () => {
    expect(channelOfAccountType("ZALO_ACCOUNT")).toBe("zalo");
    expect(channelOfAccountType("ZALO_PAGE")).toBe("zalo");
  });

  it("maps telegram, website, instagram, tiktok and shopee", () => {
    expect(channelOfAccountType("TELEGRAM_BOT")).toBe("telegram");
    expect(channelOfAccountType("WEBSITE_WIDGET")).toBe("website");
    expect(channelOfAccountType("INSTAGRAM_ACCOUNT")).toBe("instagram");
    expect(channelOfAccountType("INSTAGRAM_PAGE")).toBe("instagram");
    expect(channelOfAccountType("TIKTOK_SHOP")).toBe("tiktok");
    expect(channelOfAccountType("SHOPEE_SHOP")).toBe("shopee");
  });

  it("has no channel for the API channel", () => {
    expect(channelOfAccountType("API_CHANNEL")).toBeNull();
  });
});
