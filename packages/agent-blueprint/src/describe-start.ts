import { guessBusinessType } from "./guess-business-type";
import { prefillFromText } from "./prefill";
import { createProfile, type AgentProfile } from "./profile";
import { applySuggestion, applyTexts, confidenceLevel, type AgentSuggestion } from "./suggest";

export type DescribeStart = {
  profile: AgentProfile;
  /** Question ids the description already answered: shown as answers, not asked (#256). */
  answered: string[];
  /** Whether the business type came from the description at all. */
  understood: boolean;
};

const sure = (s: { confidence: number } | null) => !!s && confidenceLevel(s.confidence) === "auto";

/** The profile a description starts the builder with, and what it answered. */
export function describeStart(suggestion: AgentSuggestion | null, description: string, language: string): DescribeStart {
  const suggested = suggestion ? applySuggestion(suggestion, language) : null;
  const guess = suggested ? null : guessBusinessType(description);
  // The model can read details without settling the type: keep them either way.
  const start = suggested ?? applyTexts(createProfile(guess ?? "ecommerce", language), suggestion?.texts ?? {});
  const profile = prefillFromText(start, description);

  const answered: string[] = [];
  if (suggested && suggestion && sure(suggestion.businessType)) {
    answered.push("businessType", "goals");
    if (sure(suggestion.personality)) answered.push("personality");
    if (sure(suggestion.formality)) answered.push("formality");
  } else if (guess) {
    answered.push("businessType");
  }
  if (profile.businessName) answered.push("businessName");
  for (const [fact, text] of Object.entries(profile.facts)) if (text) answered.push(`facts.${fact}`);

  return { profile, answered, understood: !!suggested || !!guess };
}
