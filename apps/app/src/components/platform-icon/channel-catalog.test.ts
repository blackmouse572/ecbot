import en from "@/i18n/translations/en.json";
import vi from "@/i18n/translations/vi.json";
import { describe, expect, it } from "vitest";
import { accountTypesOf, CHANNELS, channelOf } from "./channel-catalog";

describe("channel catalog", () => {
  it("gives every channel at least one account type", () => {
    for (const c of CHANNELS)
      expect(accountTypesOf(c.key).length).toBeGreaterThan(0);
  });

  // The connect page shows accounts.create.platform.options.<connectAs> under
  // each channel; a missing key shows the raw key instead.
  it.each([
    ["en", en],
    ["vi", vi],
  ] as const)("%s describes every channel on the connect page", (_l, dict) => {
    const options: Record<string, string> =
      dict.accounts.create.platform.options;
    expect(CHANNELS.filter((c) => !options[c.connectAs])).toEqual([]);
  });

  it("connects each channel with one of its own account types", () => {
    for (const c of CHANNELS)
      expect(accountTypesOf(c.key)).toContain(c.connectAs);
  });

  it("gives each channel its own chart colour", () => {
    expect(new Set(CHANNELS.map((c) => c.color)).size).toBe(CHANNELS.length);
  });

  it("groups a page and an account of the same platform", () => {
    expect(channelOf("FACEBOOK_PAGE")).toBe(channelOf("FACEBOOK_ACCOUNT"));
    expect(channelOf("ZALO_PAGE").label).toBe("Zalo");
  });
});
