import { BUSINESS_TYPES, getBusinessType, type BusinessTypeId } from "./business-types";
import { FORMALITY, GOALS, PERSONAL_GOALS, PERSONALITY, RULES, type GoalId, type RuleId } from "./libraries";
import { withArticle } from "./compile-prompt";
import { createProfile, type AgentProfile } from "./profile";

export type SystemOneQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "noul"; instructions: string };
export type SystemOneAnswer =
  | { type: "choice"; choice: string; confidence: number }
  | { type: "noul"; noul: number };
export type Scored = { value: string; confidence: number };
export type AgentSuggestion = {
  businessType: Scored | null;
  personality: Scored | null;
  formality: Scored | null;
  goals: Record<string, number>;
  rules: Record<string, number>;
};

export const EMPTY_SUGGESTION: AgentSuggestion = { businessType: null, personality: null, formality: null, goals: {}, rules: {} };

const criteria = (list: readonly { id: string; prompt: string }[]) =>
  Object.fromEntries(list.map((x) => [x.id, x.prompt]));

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildSuggestQuestions(): Record<string, SystemOneQuestion> {
  const questions: Record<string, SystemOneQuestion> = {
    business_type: {
      type: "choice",
      instructions: "The state is how a business owner describes the chat assistant they want. Which kind of business or assistant is it?",
      criteria: Object.fromEntries(BUSINESS_TYPES.map((t) => [t.id, t.personal ? `A personal ${t.promptLabel} for the owner` : `${sentence(withArticle(t.promptLabel))} talking to customers`])),
    },
    personality: {
      type: "choice",
      instructions: "Which personality would suit this business's chat assistant best?",
      criteria: criteria(PERSONALITY),
    },
    formality: {
      type: "choice",
      instructions: "How formal should this assistant be with the people it talks to?",
      criteria: criteria(FORMALITY),
    },
  };
  for (const g of GOALS) questions[`goal__${g.id}`] = { type: "noul", instructions: `Should the assistant do this job? ${g.prompt}` };
  for (const r of RULES) questions[`rule__${r.id}`] = { type: "noul", instructions: `Is this rule important for this business? ${r.prompt}` };
  return questions;
}

function scored(a: SystemOneAnswer | undefined | null, allowed: readonly string[]): Scored | null {
  if (!a || typeof a !== "object" || a.type !== "choice" || typeof a.choice !== "string" || !allowed.includes(a.choice)) return null;
  const confidence = Number(a.confidence);
  const clampedConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
  return { value: a.choice, confidence: clampedConfidence };
}

export function readSuggestAnswers(answers: Record<string, SystemOneAnswer | undefined> | null | undefined): AgentSuggestion {
  const safeAnswers = typeof answers === "object" && answers !== null ? answers : {};
  const goalIds = new Set(GOALS.map((g) => g.id));
  const ruleIds = new Set(RULES.map((r) => r.id));

  const nouls = (prefix: string, idValidator: Set<string>) => Object.fromEntries(
    Object.entries(safeAnswers)
      .filter(([k, a]) => {
        if (!k.startsWith(prefix) || !a || typeof a !== "object") return false;
        if (a.type !== "noul" || typeof a.noul !== "number") return false;
        const id = k.slice(prefix.length);
        const noul = (a as { noul: number }).noul;
        return idValidator.has(id) && Number.isFinite(noul) && noul >= 0;
      })
      .map(([k, a]) => [k.slice(prefix.length), Math.min(1, (a as { noul: number }).noul)]),
  );
  return {
    businessType: scored(safeAnswers.business_type, BUSINESS_TYPES.map((t) => t.id)),
    personality: scored(safeAnswers.personality, PERSONALITY.map((p) => p.id)),
    formality: scored(safeAnswers.formality, FORMALITY.map((f) => f.id)),
    goals: nouls("goal__", goalIds),
    rules: nouls("rule__", ruleIds),
  };
}

export function confidenceLevel(c: number): "auto" | "check" | "none" {
  if (c >= 0.9) return "auto";
  if (c >= 0.5) return "check";
  return "none";
}

export function applySuggestion(s: AgentSuggestion, primaryLanguage: string): AgentProfile | null {
  if (!s.businessType || confidenceLevel(s.businessType.confidence) === "none") return null;
  const typeId = s.businessType.value as BusinessTypeId;
  const personal = getBusinessType(typeId).personal;
  const base = createProfile(typeId, primaryLanguage);
  const allowedGoals = new Set<GoalId>(personal ? PERSONAL_GOALS : GOALS.map((g) => g.id).filter((g) => !PERSONAL_GOALS.includes(g) || g === "capture_leads"));
  const validRuleIds = new Set(RULES.map((r) => r.id));
  const likely = <T extends string>(scores: Record<string, number>, validator?: Set<string>) =>
    Object.entries(scores).filter(([id, p]) => p >= 0.5 && (!validator || validator.has(id))).map(([id]) => id as T);
  return {
    ...base,
    goals: Array.from(new Set([...base.goals, ...likely<GoalId>(s.goals).filter((g) => allowedGoals.has(g))])),
    rules: Array.from(new Set([...base.rules, ...likely<RuleId>(s.rules, validRuleIds)])),
    personality: s.personality && confidenceLevel(s.personality.confidence) !== "none" ? [s.personality.value as AgentProfile["personality"][number]] : base.personality,
    formality: s.formality && confidenceLevel(s.formality.confidence) !== "none" ? (s.formality.value as AgentProfile["formality"]) : base.formality,
  };
}
