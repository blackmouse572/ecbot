import type { ChannelId } from "@repo/agent-blueprint";
import { afterEach, describe, expect, it, vi } from "vitest";

// Read when channel-accounts loads, so it is set before the import below.
vi.hoisted(() => vi.stubEnv("VITE_INSTAGRAM_APP_ID", "IG_APP"));

import {
  CHANNEL_CONNECT,
  channelOfAccountType,
  isConnectableAccountType,
  isPersonalAccountType,
} from "./channel-accounts";

afterEach(() => {
  vi.stubEnv("VITE_INSTAGRAM_APP_ID", "IG_APP");
});

describe("CHANNEL_CONNECT", () => {
  it("maps messenger, zalo and instagram to oauth platforms", () => {
    expect(CHANNEL_CONNECT.messenger).toEqual({
      kind: "oauth",
      platform: "FACEBOOK_ACCOUNT",
    });
    expect(CHANNEL_CONNECT.zalo).toEqual({
      kind: "oauth",
      platform: "ZALO_ACCOUNT",
    });
    expect(CHANNEL_CONNECT.instagram).toEqual({
      kind: "oauth",
      platform: "INSTAGRAM_ACCOUNT",
    });
  });

  it("maps telegram to a token connect and website to a widget", () => {
    expect(CHANNEL_CONNECT.telegram).toEqual({
      kind: "token",
      platform: "TELEGRAM_BOT",
    });
    expect(CHANNEL_CONNECT.website).toEqual({ kind: "widget" });
  });

  it("keeps instagram coming soon in a build without the Instagram app id", async () => {
    vi.stubEnv("VITE_INSTAGRAM_APP_ID", "");
    vi.resetModules();
    const fresh = await import("./channel-accounts");
    expect(fresh.CHANNEL_CONNECT.instagram).toEqual({ kind: "comingSoon" });
  });

  it("marks tiktok and shopee as coming soon", () => {
    expect(CHANNEL_CONNECT.tiktok).toEqual({ kind: "comingSoon" });
    expect(CHANNEL_CONNECT.shopee).toEqual({ kind: "comingSoon" });
  });

  it("has an entry for every channel id", () => {
    const channels: ChannelId[] = [
      "messenger",
      "instagram",
      "zalo",
      "tiktok",
      "shopee",
      "website",
      "telegram",
    ];
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

describe("personal accounts", () => {
  it("treats personal Facebook and Instagram profiles as hidden and unconnectable", () => {
    for (const type of ["FACEBOOK_ACCOUNT", "INSTAGRAM_ACCOUNT"] as const) {
      expect(isPersonalAccountType(type)).toBe(true);
      expect(isConnectableAccountType(type)).toBe(false);
    }
  });

  it("keeps Pages and business accounts visible and connectable", () => {
    for (const type of [
      "FACEBOOK_PAGE",
      "INSTAGRAM_PAGE",
      "ZALO_PAGE",
    ] as const) {
      expect(isPersonalAccountType(type)).toBe(false);
      expect(isConnectableAccountType(type)).toBe(true);
    }
    expect(isConnectableAccountType("API_CHANNEL")).toBe(false);
  });
});
