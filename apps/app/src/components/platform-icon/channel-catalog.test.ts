import { describe, expect, it } from "vitest";
import { accountTypesOf, CHANNELS, channelOf } from "./channel-catalog";

describe("channel catalog", () => {
  it("gives every channel at least one account type", () => {
    for (const c of CHANNELS)
      expect(accountTypesOf(c.key).length).toBeGreaterThan(0);
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
