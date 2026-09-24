import { z } from "zod";
import { BUSINESS_TYPE_IDS, getBusinessType, type BusinessTypeId } from "./business-types";
import {
  ADDRESS_STYLE, AFTER_HOURS, CHANNELS, COLLECT, FACTS, FORMALITY, GOALS, HANDOFF_WHEN,
  PERSONALITY, REPLY_LENGTH, RULES, UNSURE, idsOf, type FactId,
} from "./libraries";
import { PRESETS } from "./presets";

export const PROFILE_LIMITS = { shortText: 120, longText: 1000 } as const;

const shortText = z.string().trim().max(PROFILE_LIMITS.shortText);
const longText = z.string().trim().max(PROFILE_LIMITS.longText);

export const agentProfileSchema = z.object({
  version: z.literal(1),
  businessType: z.enum(BUSINESS_TYPE_IDS),
  businessName: shortText,
  agentName: shortText,
  channels: z.array(z.enum(idsOf(CHANNELS))),
  goals: z.array(z.enum(idsOf(GOALS))),
  greeting: longText,
  difference: longText,
  personality: z.array(z.enum(idsOf(PERSONALITY))).max(2),
  formality: z.enum(idsOf(FORMALITY)),
  facts: z.partialRecord(z.enum(idsOf(FACTS)), longText),
  collect: z.array(z.enum(idsOf(COLLECT))),
  handoffWhen: z.array(z.enum(idsOf(HANDOFF_WHEN))),
  rules: z.array(z.enum(idsOf(RULES))),
  unsure: z.enum(idsOf(UNSURE)),
  replyLength: z.enum(idsOf(REPLY_LENGTH)),
  emoji: z.boolean(),
  addressStyle: z.enum(idsOf(ADDRESS_STYLE)).nullable(),
  followUpQuestions: z.boolean(),
  afterHours: z.enum(idsOf(AFTER_HOURS)),
  primaryLanguage: z.string().min(2).max(8),
}).strict();

export type AgentProfile = z.infer<typeof agentProfileSchema>;

export function createProfile(type: BusinessTypeId, primaryLanguage: string): AgentProfile {
  const personal = getBusinessType(type).personal;
  const preset = PRESETS[type];
  return {
    version: 1,
    businessType: type,
    businessName: "",
    agentName: "",
    channels: personal ? [] : ["messenger"],
    goals: [...preset.goals],
    greeting: "",
    difference: "",
    personality: ["warm"],
    formality: "balanced",
    facts: {},
    collect: [...preset.collect],
    handoffWhen: personal ? [] : ["asks_for_human", "upset"],
    rules: [...preset.rules],
    unsure: personal ? "say_unknown" : "handoff",
    replyLength: "short",
    emoji: !personal,
    addressStyle: primaryLanguage === "vi" ? "em_anhchi" : null,
    followUpQuestions: !personal,
    afterHours: "share_hours",
    primaryLanguage,
  };
}

export function applyPreset(profile: AgentProfile, type: BusinessTypeId): AgentProfile {
  const fresh = createProfile(type, profile.primaryLanguage);
  const allowed = new Set<FactId>(PRESETS[type].facts);
  const facts = Object.fromEntries(
    Object.entries(profile.facts).filter(([id]) => allowed.has(id as FactId)),
  ) as AgentProfile["facts"];
  return {
    ...fresh,
    businessName: profile.businessName,
    agentName: profile.agentName,
    greeting: profile.greeting,
    difference: profile.difference,
    personality: profile.personality,
    formality: profile.formality,
    replyLength: profile.replyLength,
    emoji: profile.emoji,
    addressStyle: profile.addressStyle,
    facts,
  };
}
