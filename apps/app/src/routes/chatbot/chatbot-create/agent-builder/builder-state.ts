import {
  buildQuestionGroups, createProfile, prefillFromText, readAnswer, writeAnswer,
  type AgentProfile, type AgentSuggestion, type Question, type QuestionGroup,
} from "@repo/agent-blueprint";
import type { AccountGetDetailResponseDto } from "@repo/client";

/** Just enough of a linked account to derive the channels answer and the
 * answered summary without a query round trip. */
export type LinkedAccountRef = Pick<AccountGetDetailResponseDto, "id" | "type" | "name">;

export type BuilderState = {
  profile: AgentProfile | null;
  suggestion: AgentSuggestion | null;
  /** The description named the business type (by suggestion or keywords). */
  understood: boolean;
  source: "describe" | "template" | "hydrate" | null;
  // The raw text typed into the step-0 describe box, kept only to redisplay
  // it as the step-0 answer bubble (it isn't part of AgentProfile).
  describeText: string | null;
  answered: string[];
  editing: string | null;
  chatbotId: string | null;
  finished: boolean;
  // The owner chose "later" when asked to activate after the channel step.
  activateLater: boolean;
  // The accounts currently linked to this draft, tracked locally (not just
  // ids) so both the channels answer and the answered summary can be
  // derived synchronously right after a link/unlink, without waiting on a
  // query refetch.
  linkedAccounts: LinkedAccountRef[];
};

export type BuilderAction =
  | {
      type: "start";
      profile: AgentProfile;
      suggestion: AgentSuggestion | null;
      source: "describe" | "template";
      /** Question ids the description already answered (#256). */
      answered?: string[];
      understood?: boolean;
      description?: string;
      prefillBusinessName?: string;
    }
  | { type: "hydrate"; profile: AgentProfile; chatbotId: string; finished: boolean; accounts?: LinkedAccountRef[] }
  | { type: "answer"; question: Question; value: unknown }
  | { type: "skip"; question: Question }
  | { type: "edit"; questionId: string }
  | { type: "restart" }
  | { type: "draftCreated"; chatbotId: string }
  | { type: "finished" }
  | { type: "activateLater" }
  | { type: "accountsLinked"; accounts: LinkedAccountRef[] }
  | { type: "accountsUnlinked"; ids: string[] };

export type Step = { group: QuestionGroup; question: Question };

export const initialBuilderState: BuilderState = {
  profile: null, suggestion: null, understood: false, source: null, describeText: null, answered: [], editing: null, chatbotId: null, finished: false, activateLater: false,
  linkedAccounts: [],
};

export function steps(profile: AgentProfile): Step[] {
  return buildQuestionGroups(profile).flatMap((group) => group.questions.map((question) => ({ group, question })));
}

// #151: most answers are a tap or a short phrase, and several can be skipped.
const SECONDS_PER_QUESTION = 15;

/** Rough minutes left from this question to the end, never below one. */
export function minutesLeft({ current, total }: { current: number; total: number }): number {
  return Math.max(1, Math.ceil(((total - current + 1) * SECONDS_PER_QUESTION) / 60));
}

export function currentStep(state: BuilderState): Step | null {
  if (!state.profile) return null;
  const all = steps(state.profile);
  if (state.editing) return all.find((s) => s.question.id === state.editing) ?? null;
  return all.find((s) => !state.answered.includes(s.question.id)) ?? null;
}

// Owner decision (batch 3): the draft is created once agentName is
// answered, the 3rd identity question for every business type, so this
// holds regardless of type, not right after businessType.
export function isDraftReady(state: BuilderState): boolean {
  return !!state.profile && state.answered.includes("agentName");
}

/** The question after which the builder asks whether to activate: the
 * channel step, or the agent name for personal types, which have none. */
export function activationAnchor(profile: AgentProfile): string {
  return steps(profile).some((s) => s.question.id === "channels") ? "channels" : "agentName";
}

/** Whether the ask to activate shows in the thread. Not for a reopened
 * agent, which already went through the builder once. */
export function asksActivation(state: BuilderState): boolean {
  if (!state.profile || !state.chatbotId || state.source === "hydrate") return false;
  const anchor = activationAnchor(state.profile);
  return state.answered.includes(anchor) && state.editing !== anchor;
}

/** The ask is shown and not answered yet: the next question waits. */
export function awaitsActivation(state: BuilderState): boolean {
  return asksActivation(state) && !state.finished && !state.activateLater;
}

export function isComplete(state: BuilderState): boolean {
  return !!state.profile && currentStep({ ...state, editing: null }) === null;
}

const KEEP_PRESET_ON_SKIP = new Set<string>(["rules", "collect", "handoffWhen"]);

const addOnce = (list: string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "start": {
      // Answers already given in the description (the business name, a
      // return policy) are filled in, not asked again (#150, #156).
      const profile =
        action.source === "describe" && action.description
          ? prefillFromText(action.profile, action.description)
          : action.profile;
      // The channel the owner came from names the business unless an answer
      // (a description) already provided one; remains unanswered, so the
      // question still asks, prefilled.
      const seeded =
        action.prefillBusinessName && !profile.businessName.trim()
          ? { ...profile, businessName: action.prefillBusinessName }
          : profile;
      return {
        ...initialBuilderState,
        // Preserve an existing draft's id (and its linked accounts):
        // choosing a template (or a new description) after `restart`
        // updates that draft instead of creating a second one.
        chatbotId: state.chatbotId,
        linkedAccounts: state.linkedAccounts,
        profile: seeded,
        suggestion: action.suggestion,
        understood: action.understood ?? false,
        source: action.source,
        describeText: action.source === "describe" ? (action.description ?? null) : null,
        // The template already chose the business type.
        answered: action.source === "template" ? ["businessType"] : (action.answered ?? []),
      };
    }
    case "hydrate":
      return {
        ...initialBuilderState,
        profile: action.profile,
        source: "hydrate",
        chatbotId: action.chatbotId,
        finished: action.finished,
        answered: steps(action.profile).map((s) => s.question.id),
        linkedAccounts: action.accounts ?? [],
      };
    case "answer": {
      if (!state.profile) return state;
      const typeChanged = action.question.id === "businessType" && action.value !== state.profile.businessType;
      const written = writeAnswer(state.profile, action.question.path, action.value);
      // "What makes you different" often states a policy asked later (#156).
      const profile =
        action.question.id === "difference" && typeof action.value === "string"
          ? prefillFromText(written, action.value)
          : written;
      // A new business type brings new presets and questions, so only the
      // type itself stays answered.
      const answered = typeChanged ? ["businessType"] : addOnce(state.answered, action.question.id);
      return { ...state, profile, answered, editing: null };
    }
    case "skip": {
      if (!state.profile) return state;
      // Skip means "no answer of my own": drop what auto-fill added. Safety
      // rules, contact fields and handoff triggers fall back to the preset,
      // other choices and text are cleared, and a yes/no keeps its default.
      const { kind, path, required } = action.question;
      const preset = createProfile(state.profile.businessType, state.profile.primaryLanguage);
      const skipped = KEEP_PRESET_ON_SKIP.has(path.field)
        ? readAnswer(preset, path)
        : kind === "multi" ? [] : kind === "text" ? "" : undefined;
      const profile = required || skipped === undefined ? state.profile : writeAnswer(state.profile, path, skipped);
      return { ...state, profile, answered: addOnce(state.answered, action.question.id), editing: null };
    }
    case "edit":
      return { ...state, editing: action.questionId };
    case "restart":
      // Back to step 0. Keeps chatbotId (and its linked accounts) so
      // choosing again updates the existing draft instead of creating a
      // second one.
      return { ...initialBuilderState, chatbotId: state.chatbotId, linkedAccounts: state.linkedAccounts };
    case "draftCreated":
      return { ...state, chatbotId: action.chatbotId };
    case "finished":
      return { ...state, finished: true };
    case "activateLater":
      return { ...state, activateLater: true };
    case "accountsLinked": {
      const existingIds = new Set(state.linkedAccounts.map((a) => a.id));
      const additions = action.accounts.filter((a) => !existingIds.has(a.id));
      return { ...state, linkedAccounts: [...state.linkedAccounts, ...additions] };
    }
    case "accountsUnlinked":
      return { ...state, linkedAccounts: state.linkedAccounts.filter((a) => !action.ids.includes(a.id)) };
  }
}
