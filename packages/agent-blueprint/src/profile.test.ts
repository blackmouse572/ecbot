import { describe, expect, it } from "vitest";
import { agentProfileSchema, applyPreset, createProfile } from "./profile";

describe("createProfile", () => {
  it("fills presets and sane defaults for an SMB type", () => {
    const p = createProfile("beauty", "vi");
    expect(p.goals).toEqual(["answer_questions", "recommend", "book_appointments", "promotions"]);
    expect(p.rules).toContain("no_medical_advice");
    expect(p.collect).toEqual(["name", "phone", "date_time", "product_interest"]);
    expect(p.channels).toEqual(["messenger"]);
    expect(p.handoffWhen).toEqual(["asks_for_human", "upset"]);
    expect(p.unsure).toBe("handoff");
    expect(p.addressStyle).toBe("em_anhchi");
    expect(agentProfileSchema.parse(p)).toEqual(p);
  });

  it("uses personal defaults and no address style for English", () => {
    const p = createProfile("personal_email", "en");
    expect(p.channels).toEqual([]);
    expect(p.handoffWhen).toEqual([]);
    expect(p.unsure).toBe("say_unknown");
    expect(p.addressStyle).toBeNull();
  });
});

describe("applyPreset", () => {
  it("switches goals, rules, collect and drops facts that the new type does not ask", () => {
    const spa = { ...createProfile("beauty", "vi"), businessName: "Lotus", facts: { services_prices: "Gel 150k", opening_hours: "9h-21h" } };
    const next = applyPreset(spa, "restaurant");
    expect(next.businessType).toBe("restaurant");
    expect(next.businessName).toBe("Lotus");
    expect(next.goals).toContain("reservations");
    expect(next.facts).toEqual({ opening_hours: "9h-21h" });
  });
});

describe("agentProfileSchema", () => {
  it("rejects unknown goals, too many personality words and oversized text", () => {
    const base = createProfile("beauty", "vi");
    expect(agentProfileSchema.safeParse({ ...base, goals: ["hack"] }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, personality: ["warm", "expert", "calm"] }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, difference: "x".repeat(1001) }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, businessName: "x".repeat(121) }).success).toBe(false);
    expect(agentProfileSchema.safeParse({ ...base, facts: { unknown_fact: "x" } }).success).toBe(false);
  });
});
