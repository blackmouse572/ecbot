import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES } from "./business-types";
import { createProfile } from "./profile";
import { allTranslationKeys, buildQuestionGroups, readAnswer, writeAnswer } from "./questions";

const ids = (p: ReturnType<typeof createProfile>) =>
  buildQuestionGroups(p).flatMap((g) => g.questions.map((q) => q.id));

describe("buildQuestionGroups", () => {
  it("builds six groups in order for an SMB type", () => {
    expect(buildQuestionGroups(createProfile("beauty", "vi")).map((g) => g.id))
      .toEqual(["identity", "essence", "facts", "process", "rules", "interaction"]);
  });

  it("asks one fact question per preset fact", () => {
    const facts = buildQuestionGroups(createProfile("restaurant", "vi")).find((g) => g.id === "facts")!;
    expect(facts.questions.map((q) => q.id)).toEqual([
      "facts.opening_hours", "facts.address", "facts.menu_highlights",
      "facts.reservation_policy", "facts.delivery", "facts.payment_methods",
    ]);
  });

  it("hides the address style question unless the language is Vietnamese", () => {
    expect(ids(createProfile("beauty", "vi"))).toContain("addressStyle");
    expect(ids(createProfile("beauty", "en"))).not.toContain("addressStyle");
  });

  it("hides customer-facing questions for personal types", () => {
    const personal = ids(createProfile("personal_scheduling", "en"));
    ["channels", "collect", "handoffWhen", "afterHours"].forEach((id) => expect(personal).not.toContain(id));
    expect(buildQuestionGroups(createProfile("personal_scheduling", "en")).map((g) => g.id)).not.toContain("process");
  });

  it("offers personal goals to personal types and business goals to SMB types", () => {
    const goalsQ = (p: ReturnType<typeof createProfile>) =>
      buildQuestionGroups(p).flatMap((g) => g.questions).find((q) => q.id === "goals")!;
    expect(goalsQ(createProfile("beauty", "vi")).choices!.map((c) => c.value)).not.toContain("manage_schedule");
    expect(goalsQ(createProfile("personal_tasks", "en")).choices!.map((c) => c.value)).toContain("track_tasks");
  });
});

describe("readAnswer / writeAnswer", () => {
  it("reads and writes fact paths", () => {
    const p = writeAnswer(createProfile("beauty", "vi"), { field: "facts", fact: "opening_hours" }, "9h-21h");
    expect(readAnswer(p, { field: "facts", fact: "opening_hours" })).toBe("9h-21h");
  });

  it("re-applies presets when the business type changes", () => {
    const p = writeAnswer(createProfile("beauty", "vi"), { field: "businessType" }, "restaurant");
    expect(p.goals).toContain("reservations");
  });
});

describe("allTranslationKeys", () => {
  it("covers every question, choice, fact and group key without duplicates", () => {
    const keys = allTranslationKeys();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("agentBuilder.questions.goals.title");
    expect(keys).toContain("agentBuilder.goals.take_orders");
    expect(keys).toContain("agentBuilder.facts.menu_highlights.placeholder");
    expect(keys).toContain("agentBuilder.types.personal_crm");
    expect(keys).toContain("agentBuilder.groups.interaction");
  });

  it("covers every key that buildQuestionGroups can emit, for every type and language", () => {
    const known = new Set(allTranslationKeys());
    const missing = new Set<string>();
    for (const type of BUSINESS_TYPES) {
      for (const lang of ["vi", "en"]) {
        for (const group of buildQuestionGroups(createProfile(type.id, lang))) {
          const keys = [group.titleKey, ...group.questions.flatMap((q) => [
            q.titleKey, q.descriptionKey, q.placeholderKey, ...(q.choices ?? []).map((c) => c.labelKey),
          ])];
          keys.filter((k): k is string => !!k && !known.has(k)).forEach((k) => missing.add(k));
        }
      }
    }
    expect([...missing]).toEqual([]);
  });
});
