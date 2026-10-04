import { describe, expect, it } from "vitest";
import { prefillFromText } from "./prefill";
import { createProfile } from "./profile";

const store = () => createProfile("ecommerce", "en");

// #150: "the shop is called Kunmart" did not fill the business name.
describe("prefillFromText: business name", () => {
  it.each([
    ["We sell snacks online, the shop is called Kunmart and ships fast.", "Kunmart"],
    ["A bakery named Bếp Nhà Mơ in District 3", "Bếp Nhà Mơ"],
    ["Shop bán đồ ăn vặt, tên là Kunmart, giao toàn quốc", "Kunmart"],
    ["Cửa hàng có tên Kun Mart chuyên mỹ phẩm", "Kun Mart"],
  ])("%s", (text, name) => {
    expect(prefillFromText(store(), text).businessName).toBe(name);
  });

  it("keeps a name the owner already gave", () => {
    const profile = { ...store(), businessName: "Mine" };
    expect(prefillFromText(profile, "the shop is called Kunmart").businessName).toBe("Mine");
  });

  it("does not guess when no name is stated", () => {
    expect(prefillFromText(store(), "we sell shoes online").businessName).toBe("");
  });
});

// #156: "7-day returns" said earlier did not pre-fill the return policy.
describe("prefillFromText: return policy", () => {
  it("takes the part of the text about returns", () => {
    const profile = prefillFromText(store(), "Handmade bags, 7-day returns, free shipping over 500k");
    expect(profile.facts.return_policy).toBe("7-day returns");
  });

  it("understands Vietnamese", () => {
    const profile = prefillFromText(store(), "Hàng chính hãng. Đổi trả trong 7 ngày nếu lỗi.");
    expect(profile.facts.return_policy).toBe("Đổi trả trong 7 ngày nếu lỗi");
  });

  it("keeps a return policy the owner already gave", () => {
    const profile = { ...store(), facts: { return_policy: "No returns" } };
    expect(prefillFromText(profile, "7-day returns").facts.return_policy).toBe("No returns");
  });

  it("only fills it for types that ask about returns", () => {
    const restaurant = createProfile("restaurant", "en");
    expect(prefillFromText(restaurant, "7-day returns").facts.return_policy).toBeUndefined();
  });
});
