import type { FactId } from "./libraries";
import { PRESETS } from "./presets";
import type { AgentProfile } from "./profile";

// Facts a preset stopped asking, mapped to the fact that now holds the same
// answer. Online stores asked "delivery" next to "shipping_fee" until #155.
const RETIRED_FACTS: ReadonlyArray<{ from: FactId; to: FactId }> = [
  { from: "delivery", to: "shipping_fee" },
];

/**
 * Brings a stored profile up to the current presets, so an answer to a
 * question the builder no longer asks still reaches the prompt and shows in
 * the question that replaced it. The old answer is kept, never overwritten
 * over one the owner already gave.
 */
export function migrateProfile(profile: AgentProfile): AgentProfile {
  const asked = new Set<FactId>(PRESETS[profile.businessType].facts);
  let facts = profile.facts;
  for (const { from, to } of RETIRED_FACTS) {
    const old = facts[from]?.trim();
    if (asked.has(from) || !asked.has(to) || !old || facts[to]?.trim()) continue;
    facts = { ...facts, [to]: old };
  }
  return facts === profile.facts ? profile : { ...profile, facts };
}
