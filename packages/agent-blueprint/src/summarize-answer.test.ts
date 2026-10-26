import { describe, expect, it } from "vitest";
import en from "../locales/en.json";
import { buildQuestionGroups } from "./questions";
import { createProfile } from "./profile";
import { summarizeAnswer } from "./summarize-answer";

// A stand-in for i18next's t over the shipped English strings.
const t = (key: string) =>
  (key.split(".").slice(1).reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en) as string) ?? key;
const question = (id: string) =>
  buildQuestionGroups(createProfile("restaurant", "vi")).flatMap((g) => g.questions).find((q) => q.id === id)!;

describe("summarizeAnswer", () => {
  it("labels choices with their translation and keeps the owner's own values as typed", () => {
    const goals = question("goals");
    const choice = goals.choices![0]!;
    expect(summarizeAnswer(goals, [choice.value, "Ship abroad"], t)).toBe(`${t(choice.labelKey)}, Ship abroad`);
  });

  it("summarizes the week with short day names", () => {
    const week = { mon: [{ open: "08:00", close: "12:00" }], tue: [{ open: "08:00", close: "12:00" }], sun: [] };
    expect(summarizeAnswer(question("openingHours"), week, t)).toContain("08:00-12:00");
    expect(summarizeAnswer(question("openingHours"), undefined, t)).toBe("");
  });

  it("gives a custom address style as its two words", () => {
    expect(summarizeAnswer(question("addressStyle"), { self: "Shop", customer: "ba mẹ" }, t)).toBe("Shop / ba mẹ");
  });
});
