import { describe, expect, it } from "vitest";
import {
  childCodeFromName,
  closeRatePercent,
  formatRate,
  previewSourceUrl,
  sourceCodeFromName,
  withCode,
} from "./utils";

describe("sourceCodeFromName", () => {
  it("makes the same code the API does from a Vietnamese name", () => {
    expect(sourceCodeFromName("Tờ rơi Tết")).toBe("to-roi-tet");
    expect(sourceCodeFromName("Đặng  Quốc Bảo!")).toBe("dang-quoc-bao");
    expect(sourceCodeFromName("   ")).toBe("link");
  });
});

describe("childCodeFromName", () => {
  it("puts the KOL's code under the source's", () => {
    expect(childCodeFromName("to-roi-tet", "Linh Đan")).toBe(
      "to-roi-tet-linh-dan",
    );
  });

  it("stays within 57 characters, so the API's -2 still fits", () => {
    const code = childCodeFromName("a".repeat(40), "b".repeat(40));

    expect(code.length).toBeLessThanOrEqual(57);
    expect(code).toMatch(/^a{40}-b+$/);
  });
});

describe("withCode", () => {
  it("swaps the source's code for a child's in its link", () => {
    expect(
      withCode(
        "https://m.me/1234?ref=to-roi-tet",
        "to-roi-tet",
        "to-roi-tet-linh-dan",
      ),
    ).toBe("https://m.me/1234?ref=to-roi-tet-linh-dan");
  });

  it("only swaps the code at the end, not a page name that matches it", () => {
    expect(withCode("https://ig.me/m/lumi?ref=lumi", "lumi", "lumi-qr")).toBe(
      "https://ig.me/m/lumi?ref=lumi-qr",
    );
  });
});

describe("previewSourceUrl", () => {
  it("builds each channel's deep link like the API", () => {
    expect(
      previewSourceUrl(
        { type: "FACEBOOK_PAGE", link: "https://www.facebook.com/1234" },
        "to-roi-tet",
      ),
    ).toBe("https://m.me/1234?ref=to-roi-tet");
    expect(
      previewSourceUrl(
        { type: "INSTAGRAM_ACCOUNT", link: "https://instagram.com/lumi.skin" },
        "bio",
      ),
    ).toBe("https://ig.me/m/lumi.skin?ref=bio");
    expect(
      previewSourceUrl(
        { type: "TELEGRAM_BOT", link: "https://t.me/lumi_bot" },
        "vip",
      ),
    ).toBe("https://t.me/lumi_bot?start=vip");
    expect(
      previewSourceUrl(
        { type: "WEBSITE_WIDGET", link: "https://lumi.vn" },
        "tet",
        "https://lumi.vn/khuyen-mai",
      ),
    ).toBe("https://lumi.vn/khuyen-mai?ecb_src=tet");
  });

  it("is null when the channel cannot carry a code yet", () => {
    expect(
      previewSourceUrl(
        { type: "WEBSITE_WIDGET", link: "https://lumi.vn" },
        "x",
      ),
    ).toBeNull();
    expect(
      previewSourceUrl({ type: "ZALO_PAGE", link: "https://zalo.me/1" }, "x"),
    ).toBeNull();
  });
});

describe("closeRatePercent", () => {
  it("is confirmed orders per new customer, in percent", () => {
    expect(
      closeRatePercent({
        newCustomers: 186,
        potentialCustomers: 44,
        orders: 21,
      }),
    ).toBeCloseTo(11.29, 2);
  });

  it("is empty before the first customer arrives", () => {
    expect(
      closeRatePercent({ newCustomers: 0, potentialCustomers: 0, orders: 0 }),
    ).toBeNull();
    expect(closeRatePercent(undefined)).toBeNull();
  });
});

describe("formatRate", () => {
  it("writes the rate the way the reader writes numbers", () => {
    expect(formatRate(11.2903, "vi")).toBe("11,3%");
    expect(formatRate(9.2, "en")).toBe("9.2%");
  });
});
