import { describe, expect, it } from "vitest";
import {
  EMPTY_SUGGESTION, applySuggestion, buildSuggestQuestions, confidenceLevel, readSuggestAnswers,
} from "./suggest";

describe("buildSuggestQuestions", () => {
  it("asks one choice for type, personality, formality and a noul per goal and rule", () => {
    const q = buildSuggestQuestions();
    const businessType = q.business_type as { type: string; criteria: object };
    expect(businessType.type).toBe("choice");
    expect(Object.keys(businessType.criteria)).toHaveLength(21);
    const goalTakeOrders = q["goal__take_orders"] as { type: string };
    expect(goalTakeOrders.type).toBe("noul");
    const ruleNoMedicalAdvice = q["rule__no_medical_advice"] as { type: string };
    expect(ruleNoMedicalAdvice.type).toBe("noul");
    expect(JSON.stringify(q)).not.toContain("—");
  });

  it("uses the withArticle helper for business_type criteria", () => {
    const q = buildSuggestQuestions();
    const businessTypeCriteria = (q.business_type as { criteria: Record<string, string> }).criteria;
    expect(businessTypeCriteria.ecommerce).toBe("An online shop talking to customers");
    expect(businessTypeCriteria.beauty).toBe("A beauty salon or spa talking to customers");
  });
});

describe("readSuggestAnswers", () => {
  it("maps answers and ignores missing or malformed ones", () => {
    const s = readSuggestAnswers({
      business_type: { type: "choice", choice: "beauty", confidence: 0.95 },
      formality: { type: "noul", noul: 0.3 } as never,
      goal__book_appointments: { type: "noul", noul: 0.92 },
      rule__no_medical_advice: { type: "noul", noul: 0.7 },
    });
    expect(s.businessType).toEqual({ value: "beauty", confidence: 0.95 });
    expect(s.formality).toBeNull();
    expect(s.goals.book_appointments).toBe(0.92);
    expect(s.rules.no_medical_advice).toBe(0.7);
  });

  it("rejects a choice that is not a known id", () => {
    expect(readSuggestAnswers({ business_type: { type: "choice", choice: "casino", confidence: 1 } }).businessType).toBeNull();
  });
});

describe("applySuggestion", () => {
  it("returns null when the business type is not confident enough", () => {
    expect(applySuggestion(EMPTY_SUGGESTION, "vi")).toBeNull();
    expect(applySuggestion({ ...EMPTY_SUGGESTION, businessType: { value: "beauty", confidence: 0.4 } }, "vi")).toBeNull();
  });

  it("starts from the preset and adds likely goals and rules", () => {
    const p = applySuggestion({
      ...EMPTY_SUGGESTION,
      businessType: { value: "beauty", confidence: 0.95 },
      personality: { value: "premium", confidence: 0.8 },
      goals: { take_orders: 0.9, qualify_leads: 0.2, manage_schedule: 0.99 },
      rules: { no_competitors: 0.6 },
    }, "vi")!;
    expect(p.businessType).toBe("beauty");
    expect(p.goals).toContain("book_appointments");
    expect(p.goals).toContain("take_orders");
    expect(p.goals).not.toContain("qualify_leads");
    expect(p.goals).not.toContain("manage_schedule");
    expect(p.rules).toContain("no_competitors");
    expect(p.personality).toEqual(["premium"]);
  });
});

describe("confidenceLevel", () => {
  it("uses the 0.9 and 0.5 thresholds", () => {
    expect(confidenceLevel(0.9)).toBe("auto");
    expect(confidenceLevel(0.5)).toBe("check");
    expect(confidenceLevel(0.49)).toBe("none");
  });
});
