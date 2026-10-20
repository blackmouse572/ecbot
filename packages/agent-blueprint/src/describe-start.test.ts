import { describe, expect, it } from "vitest";
import { describeStart } from "./describe-start";
import { EMPTY_SUGGESTION, type AgentSuggestion } from "./suggest";

const CAFE = "Quán cà phê Mây ở Đà Nẵng, mở cửa 7h đến 22h. Khách hay hỏi menu, giá và muốn đặt bàn.";

const sure: AgentSuggestion = {
  ...EMPTY_SUGGESTION,
  businessType: { value: "restaurant", confidence: 0.98 },
  personality: { value: "warm", confidence: 0.95 },
  formality: { value: "balanced", confidence: 0.6 },
  texts: { business_name: "Mây", opening_hours: "7h đến 22h", offerings: "cà phê, trà" },
};

// #256: the builder asked again what the description had already said.
describe("describeStart", () => {
  it("marks what a sure suggestion answered, and fills the facts it read", () => {
    const { profile, answered, understood } = describeStart(sure, CAFE, "vi");
    expect(understood).toBe(true);
    expect(profile.businessType).toBe("restaurant");
    expect(profile.businessName).toBe("Mây");
    expect(profile.facts.opening_hours).toBe("7h đến 22h");
    expect(profile.facts.menu_highlights).toBe("cà phê, trà");
    expect(answered).toEqual(expect.arrayContaining([
      "businessType", "goals", "personality", "businessName", "facts.opening_hours", "facts.menu_highlights",
    ]));
    // Formality was only a guess (0.6): it is still asked.
    expect(answered).not.toContain("formality");
  });

  it("asks the type, prefilled, when the suggestion is only likely", () => {
    const { profile, answered, understood } = describeStart(
      { ...sure, businessType: { value: "restaurant", confidence: 0.7 } }, CAFE, "vi",
    );
    expect(understood).toBe(true);
    expect(profile.businessType).toBe("restaurant");
    expect(answered).not.toContain("businessType");
    expect(answered).toContain("businessName");
  });

  it("falls back to keywords when there is no suggestion", () => {
    const { profile, answered, understood } = describeStart(null, CAFE, "vi");
    expect(understood).toBe(true);
    expect(profile.businessType).toBe("restaurant");
    expect(answered).toEqual(["businessType"]);
  });

  it("falls back to keywords when the suggestion is empty", () => {
    expect(describeStart(EMPTY_SUGGESTION, CAFE, "vi").profile.businessType).toBe("restaurant");
  });

  // Review on #397: the model can read details without settling the type.
  it("keeps the details the model read when only the keywords give the type", () => {
    const { profile, answered } = describeStart(
      { ...EMPTY_SUGGESTION, texts: { business_name: "Kunmart", opening_hours: "7h đến 22h" } },
      "Quán cà phê Kunmart, mở 7h đến 22h", "vi",
    );
    expect(profile.businessType).toBe("restaurant");
    expect(profile.businessName).toBe("Kunmart");
    expect(profile.facts.opening_hours).toBe("7h đến 22h");
    expect(answered).toEqual(expect.arrayContaining(["businessType", "businessName", "facts.opening_hours"]));
  });

  it("keeps the name the owner wrote in the description", () => {
    const { profile, answered } = describeStart(null, "Shop bán đồ ăn vặt, tên là Kunmart, giao toàn quốc", "vi");
    expect(profile.businessName).toBe("Kunmart");
    expect(answered).toContain("businessName");
  });

  it("asks everything when nothing is understood", () => {
    const { profile, answered, understood } = describeStart(null, "Mình muốn một trợ lý", "vi");
    expect(understood).toBe(false);
    expect(profile.businessType).toBe("ecommerce");
    expect(answered).toEqual([]);
  });
});
