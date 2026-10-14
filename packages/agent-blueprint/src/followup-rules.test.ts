import { describe, expect, it } from "vitest";
import { compileFollowupRules } from "./followup-rules";
import { createProfile } from "./profile";

describe("compileFollowupRules", () => {
  it("adds the check-ins that fit the goals the owner picked", () => {
    const rules = compileFollowupRules({ ...createProfile("restaurant", "en"), goals: ["take_orders", "reservations"] });
    expect(rules).toContain("within 24 hours of the customer's last message");
    expect(rules).toContain("check on the payment.");
    expect(rules).toContain("Booking (table reservation)");
    expect(rules).not.toContain("Undecided:");
  });

  it("names the booking and the deposit after the business type", () => {
    const rules = compileFollowupRules({ ...createProfile("beauty", "en"), goals: ["book_appointments"] });
    expect(rules).toContain("Booking (appointment)");
    expect(rules).toContain("payment or deposit");
  });

  it("gives bigger decisions a day before checking in", () => {
    expect(compileFollowupRules({ ...createProfile("real_estate", "en"), goals: ["qualify_leads"] })).toContain("`delay_minutes` 1200");
    expect(compileFollowupRules({ ...createProfile("fashion", "en"), goals: ["recommend"] })).toContain("`delay_minutes` 180");
  });

  it("is empty when no goal needs a check-in", () => {
    expect(compileFollowupRules({ ...createProfile("ecommerce", "en"), goals: ["answer_questions"] })).toBe("");
  });

  it("leaves personal assistants without rules", () => {
    expect(compileFollowupRules(createProfile("personal_tasks", "en"))).toBe("");
  });
});
