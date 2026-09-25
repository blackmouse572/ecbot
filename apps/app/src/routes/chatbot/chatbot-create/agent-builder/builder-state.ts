import {
  buildQuestionGroups, writeAnswer,
  type AgentProfile, type AgentSuggestion, type Question, type QuestionGroup,
} from "@repo/agent-blueprint";

export type BuilderState = {
  profile: AgentProfile | null;
  suggestion: AgentSuggestion | null;
  source: "describe" | "template" | "hydrate" | null;
  // The raw text typed into the step-0 describe box, kept only to redisplay
  // it as the step-0 answer bubble (it isn't part of AgentProfile).
  describeText: string | null;
  answered: string[];
  editing: string | null;
  chatbotId: string | null;
  finished: boolean;
};

export type BuilderAction =
  | {
      type: "start";
      profile: AgentProfile;
      suggestion: AgentSuggestion | null;
      source: "describe" | "template";
      description?: string;
    }
  | { type: "hydrate"; profile: AgentProfile; chatbotId: string; finished: boolean }
  | { type: "answer"; question: Question; value: unknown }
  | { type: "skip"; question: Question }
  | { type: "edit"; questionId: string }
  | { type: "restart" }
  | { type: "draftCreated"; chatbotId: string }
  | { type: "finished" };

export type Step = { group: QuestionGroup; question: Question };

export const initialBuilderState: BuilderState = {
  profile: null, suggestion: null, source: null, describeText: null, answered: [], editing: null, chatbotId: null, finished: false,
};

export function steps(profile: AgentProfile): Step[] {
  return buildQuestionGroups(profile).flatMap((group) => group.questions.map((question) => ({ group, question })));
}

export function currentStep(state: BuilderState): Step | null {
  if (!state.profile) return null;
  const all = steps(state.profile);
  if (state.editing) return all.find((s) => s.question.id === state.editing) ?? null;
  return all.find((s) => !state.answered.includes(s.question.id)) ?? null;
}

// Wireframe delta section 4 (owner decision): the draft is created as soon
// as the business type is answered, not after the whole draft-groups run.
export function isDraftReady(state: BuilderState): boolean {
  return !!state.profile && state.answered.includes("businessType");
}

export function isComplete(state: BuilderState): boolean {
  return !!state.profile && currentStep({ ...state, editing: null }) === null;
}

const addOnce = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "start":
      return {
        ...initialBuilderState,
        // Preserve an existing draft's id: choosing a template (or a new
        // description) after `restart` updates that draft instead of
        // creating a second one.
        chatbotId: state.chatbotId,
        profile: action.profile,
        suggestion: action.suggestion,
        source: action.source,
        describeText: action.source === "describe" ? (action.description ?? null) : null,
        // The template already chose the business type.
        answered: action.source === "template" ? ["businessType"] : [],
      };
    case "hydrate":
      return {
        ...initialBuilderState,
        profile: action.profile,
        source: "hydrate",
        chatbotId: action.chatbotId,
        finished: action.finished,
        answered: steps(action.profile).map((s) => s.question.id),
      };
    case "answer": {
      if (!state.profile) return state;
      const typeChanged = action.question.id === "businessType" && action.value !== state.profile.businessType;
      const profile = writeAnswer(state.profile, action.question.path, action.value);
      // A new business type brings new presets and questions, so only the
      // type itself stays answered.
      const answered = typeChanged ? ["businessType"] : addOnce(state.answered, action.question.id);
      return { ...state, profile, answered, editing: null };
    }
    case "skip":
      return { ...state, answered: addOnce(state.answered, action.question.id), editing: null };
    case "edit":
      return { ...state, editing: action.questionId };
    case "restart":
      // Back to step 0. Keeps chatbotId so choosing again updates the
      // existing draft instead of creating a second one.
      return { ...initialBuilderState, chatbotId: state.chatbotId };
    case "draftCreated":
      return { ...state, chatbotId: action.chatbotId };
    case "finished":
      return { ...state, finished: true };
  }
}
