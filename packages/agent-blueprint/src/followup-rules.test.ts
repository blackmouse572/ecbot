import { describe, expect, it } from "vitest";
import { compileFollowupRules } from "./followup-rules";
import { createProfile } from "./profile";

describe("compileFollowupRules", () => {
  it("adds the check-ins that fit the agent's goals", () => {
    const rules = compileFollowupRules({ ...createProfile("restaurant", "en"), goals: ["take_orders", "reservations"] });
    expect(rules).toContain("within 24 hours of the customer's last message");
    expect(rules).toContain("Payment:");
    expect(rules).toContain("Booking:");
    expect(rules).not.toContain("Undecided:");
  });

  it("checks in on quiet leads", () => {
    expect(compileFollowupRules({ ...createProfile("real_estate", "en"), goals: ["qualify_leads"] })).toContain("Undecided:");
  });

  it("is empty when no goal needs a check-in", () => {
    expect(compileFollowupRules({ ...createProfile("ecommerce", "en"), goals: ["answer_questions"] })).toBe("");
  });

  it("leaves personal assistants without rules", () => {
    expect(compileFollowupRules(createProfile("personal_tasks", "en"))).toBe("");
  });
});
