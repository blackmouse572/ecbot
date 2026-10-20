import { BUSINESS_TYPES, getBusinessType, type BusinessTypeId } from "./business-types";
import { FORMALITY, GOALS, PERSONAL_GOALS, PERSONALITY, RULES, type FactId, type GoalId, type RuleId } from "./libraries";
import { withArticle } from "./compile-prompt";
import { PRESETS } from "./presets";
import { PROFILE_LIMITS, createProfile, type AgentProfile } from "./profile";

export type SystemOneQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "noul"; instructions: string }
  | { type: "text"; instructions: string };
export type SystemOneAnswer =
  | { type: "choice"; choice: string; confidence: number }
  | { type: "noul"; noul: number }
  | { type: "text"; text: string };
export type Scored = { value: string; confidence: number };
export type AgentSuggestion = {
  businessType: Scored | null;
  personality: Scored | null;
  formality: Scored | null;
  goals: Record<string, number>;
  rules: Record<string, number>;
  /** Details copied from the description, by TEXTS id (#256). */
  texts: Partial<Record<TextId, string>>;
};

export const EMPTY_SUGGESTION: AgentSuggestion = { businessType: null, personality: null, formality: null, goals: {}, rules: {}, texts: {} };

// Details a description usually gives (#256). `facts` lists the facts each one
// can answer; the first one the business type asks for gets it.
const TEXTS = [
  { id: "business_name", prompt: "What is the business called? Only a name the owner states.", facts: [] },
  { id: "opening_hours", prompt: "Which opening hours does the owner give?", facts: ["opening_hours", "working_hours"] },
  { id: "address", prompt: "Which address, area or branches does the owner give?", facts: ["address", "service_area"] },
  {
    id: "offerings",
    prompt: "Which products, dishes or services does the owner list by name, with their prices? Not the topics customers ask about.",
    facts: [
      "menu_highlights", "services_prices", "courses", "room_types", "tour_packages", "membership_plans",
      "car_models", "products_plans", "services_offered", "packages", "projects",
    ],
  },
  { id: "delivery", prompt: "What does the owner say about delivery or shipping?", facts: ["delivery", "shipping_fee"] },
  { id: "payment_methods", prompt: "Which payment methods does the owner name?", facts: ["payment_methods"] },
] as const satisfies readonly { id: string; prompt: string; facts: readonly FactId[] }[];
export type TextId = (typeof TEXTS)[number]["id"];

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
  for (const t of TEXTS) questions[`text__${t.id}`] = { type: "text", instructions: t.prompt };
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
  const texts: AgentSuggestion["texts"] = {};
  for (const t of TEXTS) {
    const a = safeAnswers[`text__${t.id}`];
    if (!a || typeof a !== "object" || a.type !== "text" || typeof a.text !== "string") continue;
    const limit = t.id === "business_name" ? PROFILE_LIMITS.shortText : PROFILE_LIMITS.longText;
    const text = a.text.trim().slice(0, limit).trim();
    if (text) texts[t.id] = text;
  }
  return {
    businessType: scored(safeAnswers.business_type, BUSINESS_TYPES.map((t) => t.id)),
    personality: scored(safeAnswers.personality, PERSONALITY.map((p) => p.id)),
    formality: scored(safeAnswers.formality, FORMALITY.map((f) => f.id)),
    goals: nouls("goal__", goalIds),
    rules: nouls("rule__", ruleIds),
    texts,
  };
}

function factsFrom(texts: AgentSuggestion["texts"], typeId: BusinessTypeId): AgentProfile["facts"] {
  const asked = PRESETS[typeId].facts as readonly FactId[];
  const facts: AgentProfile["facts"] = {};
  for (const t of TEXTS) {
    const text = texts[t.id];
    const fact = (t.facts as readonly FactId[]).find((f) => asked.includes(f));
    if (text && fact) facts[fact] = text;
  }
  return facts;
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
    businessName: s.texts?.business_name ?? base.businessName,
    facts: factsFrom(s.texts ?? {}, typeId),
    goals: Array.from(new Set([...base.goals, ...likely<GoalId>(s.goals).filter((g) => allowedGoals.has(g))])),
    rules: Array.from(new Set([...base.rules, ...likely<RuleId>(s.rules, validRuleIds)])),
    personality: s.personality && confidenceLevel(s.personality.confidence) !== "none" ? [s.personality.value as AgentProfile["personality"][number]] : base.personality,
    formality: s.formality && confidenceLevel(s.formality.confidence) !== "none" ? (s.formality.value as AgentProfile["formality"]) : base.formality,
  };
}
