import { BUSINESS_TYPES, getBusinessType, type BusinessTypeId } from "./business-types";
import {
  ADDRESS_STYLE, AFTER_HOURS, CHANNELS, COLLECT, FACTS, FORMALITY, GOALS, HANDOFF_WHEN,
  PERSONAL_GOALS, PERSONALITY, REPLY_LENGTH, RULES, UNSURE, type FactId,
} from "./libraries";
import { PRESETS } from "./presets";
import { applyPreset, type AgentProfile } from "./profile";

export type QuestionKind = "single" | "multi" | "text" | "boolean";
export type QuestionPath = { field: Exclude<keyof AgentProfile, "facts"> } | { field: "facts"; fact: FactId };
export type Question = {
  id: string;
  path: QuestionPath;
  kind: QuestionKind;
  titleKey: string;
  descriptionKey?: string;
  placeholderKey?: string;
  required: boolean;
  max?: number;
  multiline?: boolean;
  choices?: { value: string; labelKey: string }[];
};
export type GroupId = "identity" | "essence" | "facts" | "process" | "rules" | "interaction";
export type QuestionGroup = { id: GroupId; titleKey: string; questions: Question[] };

export const DRAFT_GROUPS: GroupId[] = ["identity", "essence", "facts", "process", "rules"];
export const TEMPLATE_TYPES: BusinessTypeId[] = ["restaurant", "beauty", "ecommerce", "healthcare", "education", "personal_scheduling"];

const LIBRARIES = {
  types: BUSINESS_TYPES,
  goals: GOALS,
  rules: RULES,
  unsure: UNSURE,
  handoffWhen: HANDOFF_WHEN,
  collect: COLLECT,
  personality: PERSONALITY,
  formality: FORMALITY,
  replyLength: REPLY_LENGTH,
  addressStyle: ADDRESS_STYLE,
  afterHours: AFTER_HOURS,
  channels: CHANNELS,
} as const;
type LibraryName = keyof typeof LIBRARIES;

const choicesOf = (lib: LibraryName, only?: readonly string[]) =>
  (LIBRARIES[lib] as readonly { id: string }[])
    .filter((x) => !only || only.includes(x.id))
    .map((x) => ({ value: x.id, labelKey: `agentBuilder.${lib}.${x.id}` }));

const q = (
  id: Exclude<keyof AgentProfile, "facts">,
  kind: QuestionKind,
  extra: Partial<Question> = {},
): Question => ({
  id,
  path: { field: id },
  kind,
  titleKey: `agentBuilder.questions.${id}.title`,
  required: false,
  ...extra,
});

export function buildQuestionGroups(profile: AgentProfile): QuestionGroup[] {
  const type = getBusinessType(profile.businessType);
  const personal = type.personal;
  const goalIds = personal ? PERSONAL_GOALS : GOALS.map((g) => g.id).filter((g) => !PERSONAL_GOALS.includes(g) || g === "capture_leads");

  const identity: Question[] = [
    q("businessType", "single", { required: true, choices: choicesOf("types") }),
    q("businessName", "text", {
      required: true,
      titleKey: personal ? "agentBuilder.questions.ownerName.title" : "agentBuilder.questions.businessName.title",
      placeholderKey: personal ? undefined : "agentBuilder.questions.businessName.placeholder",
    }),
    q("agentName", "text", { required: true, placeholderKey: "agentBuilder.questions.agentName.placeholder" }),
    ...(personal ? [] : [q("channels", "multi", { choices: choicesOf("channels") })]),
    q("goals", "multi", { required: true, descriptionKey: "agentBuilder.questions.goals.description", choices: choicesOf("goals", goalIds) }),
    q("greeting", "text", { multiline: true, placeholderKey: "agentBuilder.questions.greeting.placeholder" }),
  ];

  const essence: Question[] = [
    q("difference", "text", { multiline: true, placeholderKey: "agentBuilder.questions.difference.placeholder" }),
    q("personality", "multi", { max: 2, descriptionKey: "agentBuilder.questions.personality.description", choices: choicesOf("personality") }),
    q("formality", "single", { required: true, choices: choicesOf("formality") }),
  ];

  const facts: Question[] = PRESETS[profile.businessType].facts.map((fact) => ({
    id: `facts.${fact}`,
    path: { field: "facts", fact },
    kind: "text",
    titleKey: `agentBuilder.facts.${fact}.title`,
    placeholderKey: `agentBuilder.facts.${fact}.placeholder`,
    required: false,
    multiline: true,
  }));

  const process: Question[] = personal ? [] : [
    q("collect", "multi", { choices: choicesOf("collect") }),
    q("handoffWhen", "multi", { choices: choicesOf("handoffWhen") }),
  ];

  const rules: Question[] = [
    q("rules", "multi", { choices: choicesOf("rules") }),
    q("unsure", "single", { required: true, choices: choicesOf("unsure") }),
  ];

  const interaction: Question[] = [
    q("replyLength", "single", { required: true, choices: choicesOf("replyLength") }),
    q("emoji", "boolean"),
    ...(profile.primaryLanguage === "vi" ? [q("addressStyle", "single", { required: true, choices: choicesOf("addressStyle") })] : []),
    q("followUpQuestions", "boolean"),
    ...(personal ? [] : [q("afterHours", "single", { required: true, choices: choicesOf("afterHours") })]),
  ];

  const groups: QuestionGroup[] = [
    { id: "identity", titleKey: "agentBuilder.groups.identity", questions: identity },
    { id: "essence", titleKey: "agentBuilder.groups.essence", questions: essence },
    { id: "facts", titleKey: "agentBuilder.groups.facts", questions: facts },
    { id: "process", titleKey: "agentBuilder.groups.process", questions: process },
    { id: "rules", titleKey: "agentBuilder.groups.rules", questions: rules },
    { id: "interaction", titleKey: "agentBuilder.groups.interaction", questions: interaction },
  ];
  return groups.filter((g) => g.questions.length > 0);
}

export function readAnswer(profile: AgentProfile, path: QuestionPath): unknown {
  return path.field === "facts" ? profile.facts[path.fact] ?? "" : profile[path.field];
}

export function writeAnswer(profile: AgentProfile, path: QuestionPath, value: unknown): AgentProfile {
  if (path.field === "facts") return { ...profile, facts: { ...profile.facts, [path.fact]: String(value ?? "") } };
  if (path.field === "businessType") return applyPreset(profile, value as BusinessTypeId);
  return { ...profile, [path.field]: value } as AgentProfile;
}

export function allTranslationKeys(): string[] {
  const questionIds = [
    "businessType", "businessName", "ownerName", "agentName", "channels", "goals", "greeting",
    "difference", "personality", "formality", "collect", "handoffWhen", "rules", "unsure",
    "replyLength", "emoji", "addressStyle", "followUpQuestions", "afterHours",
  ];
  const withExtras: Record<string, string[]> = {
    businessName: ["placeholder"], agentName: ["placeholder"], goals: ["description"],
    greeting: ["placeholder"], difference: ["placeholder"], personality: ["description"],
  };
  const keys = questionIds.flatMap((id) => [
    `agentBuilder.questions.${id}.title`,
    ...(withExtras[id] ?? []).map((s) => `agentBuilder.questions.${id}.${s}`),
  ]);
  for (const [lib, entries] of Object.entries(LIBRARIES)) {
    for (const e of entries) keys.push(`agentBuilder.${lib}.${e.id}`);
  }
  for (const f of FACTS) keys.push(`agentBuilder.facts.${f.id}.title`, `agentBuilder.facts.${f.id}.placeholder`);
  for (const g of ["identity", "essence", "facts", "process", "rules", "interaction"]) keys.push(`agentBuilder.groups.${g}`);
  return keys;
}
