import {
  type AgentProfile,
  BUSINESS_TYPE_IDS,
  type BusinessTypeId,
  agentProfileSchema,
  applyPreset,
  createProfile,
  migrateProfile,
} from "@repo/agent-blueprint";
import * as z from "zod";

// The builder's answers an agent can send: the app's own profile schema, so
// the tool lists every valid library id. Type and language come from the
// chatbot's own fields, so the two never disagree.
const {
  version: _version,
  businessType: _businessType,
  primaryLanguage: _primaryLanguage,
  ...answers
} = agentProfileSchema.shape;

export const profileInput = z
  .object(answers)
  .partial()
  .optional()
  .describe(
    "The agent's profile, as the Ecbot agent builder asks it: who it is, its goals, tone, rules, facts and when it hands over. The prompt is compiled from it. Send only the answers you set: the rest keep their current value, or the business type's preset on a new chatbot. facts merge into the stored facts by id (send an empty string to clear one); a list such as goals or rules replaces the whole list.",
  );

export type ProfileAnswers = z.infer<typeof profileInput>;

// Types kept for older chatbots (spa, entertainment, other) have no preset.
export const NEEDS_BUSINESS_TYPE = `A profile needs a business type: set type to one of ${BUSINESS_TYPE_IDS.join(", ")}.`;

export function isBusinessType(type: string): type is BusinessTypeId {
  return (BUSINESS_TYPE_IDS as readonly string[]).includes(type);
}

/**
 * The profile to save: `answers` over the stored profile (moved to the new
 * preset when the type changes), or over the type's preset for a chatbot
 * without one. Returns the schema's complaints when the result is invalid.
 */
export function buildProfile(
  stored: AgentProfile | null | undefined,
  chatbot: { name: string; type: BusinessTypeId; primaryLanguage: string },
  answers: ProfileAnswers = {},
): { profile: AgentProfile } | { error: string } {
  const base = stored
    ? stored.businessType === chatbot.type
      ? migrateProfile(stored)
      : applyPreset(migrateProfile(stored), chatbot.type)
    : {
        ...createProfile(chatbot.type, chatbot.primaryLanguage),
        agentName: chatbot.name,
      };
  const parsed = agentProfileSchema.safeParse({
    ...base,
    ...answers,
    facts: { ...base.facts, ...answers.facts },
    businessType: chatbot.type,
    primaryLanguage: chatbot.primaryLanguage,
  });
  if (parsed.success) return { profile: parsed.data };
  return {
    error: `Invalid profile: ${parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "profile"}: ${issue.message}`)
      .join("; ")}`,
  };
}
