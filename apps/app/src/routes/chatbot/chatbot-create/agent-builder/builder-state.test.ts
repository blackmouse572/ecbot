import { createProfile } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import {
  builderReducer, currentStep, initialBuilderState, isComplete, isDraftReady, steps, type BuilderState,
} from "./builder-state";

const started = (): BuilderState =>
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

  it("is draft-ready only after every question up to Rules is answered or skipped", () => {
    const s = answerAllUntil(started(), isDraftReady);
    expect(isDraftReady(s)).toBe(true);
    expect(currentStep(s)?.group.id).toBe("interaction");
    expect(isComplete(s)).toBe(false);
    expect(isComplete(answerAllUntil(s, isComplete))).toBe(true);
  });

  it("hydrates an existing builder chatbot as fully answered", () => {
    const s = builderReducer(initialBuilderState, { type: "hydrate", profile: createProfile("hotel", "en"), chatbotId: "c1", finished: true });
    expect(isComplete(s)).toBe(true);
    expect(s.chatbotId).toBe("c1");
  });
});
