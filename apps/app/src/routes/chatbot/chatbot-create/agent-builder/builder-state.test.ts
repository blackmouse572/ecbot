import { createProfile } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import {
  builderReducer, currentStep, initialBuilderState, isComplete, isDraftReady, steps, type BuilderState,
} from "./builder-state";

// Generic reducer-flow tests use "describe" so businessType starts
// unanswered; the template-specific skip behavior (section B) gets its own
// helper below.
const started = (): BuilderState =>
  builderReducer(initialBuilderState, { type: "start", profile: createProfile("beauty", "vi"), suggestion: null, source: "describe" });

const startedFromTemplate = (): BuilderState =>
  builderReducer(initialBuilderState, { type: "start", profile: createProfile("beauty", "vi"), suggestion: null, source: "template" });

function answerAllUntil(state: BuilderState, stop: (s: BuilderState) => boolean): BuilderState {
  let s = state;
  for (let guard = 0; guard < 100 && !stop(s); guard++) {
    const step = currentStep(s)!;
    s = builderReducer(s, { type: "skip", question: step.question });
  }
  return s;
}

describe("builderReducer", () => {
  it("starts on the first identity question", () => {
    expect(currentStep(started())?.question.id).toBe("businessType");
  });

  it("skips the business-type question when starting from a template", () => {
    const s = startedFromTemplate();
    expect(s.answered).toEqual(["businessType"]);
    expect(currentStep(s)?.question.id).toBe("businessName");
  });

  // Skipping must not drop the preset's safety rules, contact fields or
  // handoff triggers; it only drops what auto-fill added on top of them.
  it.each(["rules", "collect", "handoffWhen"] as const)("resets %s to the preset when skipped", (id) => {
    const s0 = answerAllUntil(started(), (x) => currentStep(x)?.question.id === id);
    const preset = createProfile("beauty", "vi")[id];
    expect(preset.length).toBeGreaterThan(0);
    const filled = { ...s0, profile: { ...s0.profile!, [id]: [] } };
    const s1 = builderReducer(filled, { type: "skip", question: currentStep(filled)!.question });
    expect(s1.profile![id]).toEqual(preset);
    expect(s1.answered).toContain(id);
  });

  it("drops rules auto-fill added when the rules question is skipped", () => {
    const s0 = answerAllUntil(started(), (x) => currentStep(x)?.question.id === "rules");
    const filled = { ...s0, profile: { ...s0.profile!, rules: [...s0.profile!.rules, "no_competitors" as const] } };
    const s1 = builderReducer(filled, { type: "skip", question: currentStep(filled)!.question });
    expect(s1.profile!.rules).toEqual(createProfile("beauty", "vi").rules);
    expect(s1.profile!.rules).toContain("no_medical_advice");
  });

  it("clears other optional choices when skipped", () => {
    const s0 = answerAllUntil(started(), (x) => currentStep(x)?.question.id === "personality");
    const s1 = builderReducer(s0, { type: "skip", question: currentStep(s0)!.question });
    expect(s1.profile!.personality).toEqual([]);
  });

  it("clears an auto-filled text answer when it is skipped", () => {
    const s0 = answerAllUntil(started(), (x) => currentStep(x)?.question.id === "difference");
    const filled = { ...s0, profile: { ...s0.profile!, difference: "Auto-filled" } };
    const s1 = builderReducer(filled, { type: "skip", question: currentStep(filled)!.question });
    expect(s1.profile!.difference).toBe("");
  });

  it("records an answer and moves to the next question", () => {
    const s0 = started();
    const s1 = builderReducer(s0, { type: "answer", question: currentStep(s0)!.question, value: "beauty" });
    expect(s1.answered).toEqual(["businessType"]);
    expect(currentStep(s1)?.question.id).toBe("businessName");
  });

  it("re-opens an answered question for editing, then resumes", () => {
    const s1 = builderReducer(started(), { type: "skip", question: currentStep(started())!.question });
    const editing = builderReducer(s1, { type: "edit", questionId: "businessType" });
    expect(currentStep(editing)?.question.id).toBe("businessType");
    const back = builderReducer(editing, { type: "answer", question: currentStep(editing)!.question, value: "beauty" });
    expect(back.editing).toBeNull();
    expect(currentStep(back)?.question.id).toBe("businessName");
  });

  it("resets later answers when the business type changes", () => {
    const s = answerAllUntil(started(), (x) => x.answered.includes("greeting"));
    const edited = builderReducer(builderReducer(s, { type: "edit", questionId: "businessType" }), {
      type: "answer", question: steps(s.profile!)[0].question, value: "restaurant",
    });
    expect(edited.profile!.goals).toContain("reservations");
    expect(edited.answered).toEqual(["businessType"]);
  });

  it("is draft-ready only once agentName is answered (owner decision: step 3, not businessType)", () => {
    let s = started();
    expect(isDraftReady(s)).toBe(false);
    s = builderReducer(s, { type: "answer", question: currentStep(s)!.question, value: "beauty" }); // businessType
    expect(isDraftReady(s)).toBe(false);
    expect(currentStep(s)?.question.id).toBe("businessName");
    s = builderReducer(s, { type: "answer", question: currentStep(s)!.question, value: "Lotus" }); // businessName
    expect(isDraftReady(s)).toBe(false);
    expect(currentStep(s)?.question.id).toBe("agentName");
    s = builderReducer(s, { type: "answer", question: currentStep(s)!.question, value: "Linh" }); // agentName
    expect(isDraftReady(s)).toBe(true);
  });

  it("is not draft-ready right after a template start; still needs businessName and agentName", () => {
    let s = startedFromTemplate();
    expect(isDraftReady(s)).toBe(false);
    expect(currentStep(s)?.question.id).toBe("businessName");
    s = builderReducer(s, { type: "answer", question: currentStep(s)!.question, value: "Lotus" });
    expect(isDraftReady(s)).toBe(false);
    s = builderReducer(s, { type: "answer", question: currentStep(s)!.question, value: "Linh" });
    expect(isDraftReady(s)).toBe(true);
  });

  it("reaches complete once every question is answered or skipped", () => {
    expect(isComplete(answerAllUntil(started(), isComplete))).toBe(true);
  });

  it("hydrates an existing builder chatbot as fully answered", () => {
    const s = builderReducer(initialBuilderState, { type: "hydrate", profile: createProfile("hotel", "en"), chatbotId: "c1", finished: true });
    expect(isComplete(s)).toBe(true);
    expect(s.chatbotId).toBe("c1");
  });

  it("restart keeps chatbotId and clears everything else", () => {
    const withDraft = { ...started(), chatbotId: "c1" };
    const restarted = builderReducer(withDraft, { type: "restart" });
    expect(restarted).toEqual({ ...initialBuilderState, chatbotId: "c1" });
  });

  it("keeps chatbotId when starting a new template after a restart", () => {
    const restarted = builderReducer({ ...started(), chatbotId: "c1" }, { type: "restart" });
    const s = builderReducer(restarted, {
      type: "start", profile: createProfile("restaurant", "vi"), suggestion: null, source: "template",
    });
    expect(s.chatbotId).toBe("c1");
    expect(s.answered).toEqual(["businessType"]);
  });

  const a1 = { id: "a1", type: "FACEBOOK_ACCOUNT", name: "Lotus Spa" };
  const a2 = { id: "a2", type: "TELEGRAM_BOT", name: "Lotus Bot" };

  it("seeds linkedAccounts from the hydrate action", () => {
    const s = builderReducer(initialBuilderState, {
      type: "hydrate", profile: createProfile("hotel", "en"), chatbotId: "c1", finished: true, accounts: [a1, a2],
    });
    expect(s.linkedAccounts).toEqual([a1, a2]);
  });

  it("adds newly linked accounts without duplicates", () => {
    const s = { ...started(), linkedAccounts: [a1] };
    const linked = builderReducer(s, { type: "accountsLinked", accounts: [a1, a2] });
    expect(linked.linkedAccounts).toEqual([a1, a2]);
  });

  it("removes unlinked accounts by id", () => {
    const s = { ...started(), linkedAccounts: [a1, a2] };
    const unlinked = builderReducer(s, { type: "accountsUnlinked", ids: ["a1"] });
    expect(unlinked.linkedAccounts).toEqual([a2]);
  });

  it("keeps linkedAccounts across a restart, and across starting again", () => {
    const withAccounts = { ...started(), chatbotId: "c1", linkedAccounts: [a1] };
    const restarted = builderReducer(withAccounts, { type: "restart" });
    expect(restarted.linkedAccounts).toEqual([a1]);
    const s = builderReducer(restarted, {
      type: "start", profile: createProfile("restaurant", "vi"), suggestion: null, source: "template",
    });
    expect(s.linkedAccounts).toEqual([a1]);
  });
});

// #150, #156: answers given in free text earlier are not asked again.
describe("prefill from free text", () => {
  it("fills the business name from the opening description", () => {
    const s = builderReducer(initialBuilderState, {
      type: "start",
      profile: createProfile("ecommerce", "en"),
      suggestion: null,
      source: "describe",
      description: "We sell snacks online, the shop is called Kunmart.",
    });

    expect(s.profile!.businessName).toBe("Kunmart");
  });

  it("fills the return policy from the 'what makes you different' answer", () => {
    const start = builderReducer(initialBuilderState, {
      type: "start",
      profile: createProfile("ecommerce", "en"),
      suggestion: null,
      source: "template",
    });
    const atDifference = answerAllUntil(start, (x) => currentStep(x)?.question.id === "difference");
    const s = builderReducer(atDifference, {
      type: "answer",
      question: currentStep(atDifference)!.question,
      value: "Handmade bags, 7-day returns",
    });

    expect(s.profile!.facts.return_policy).toBe("7-day returns");
  });
});
