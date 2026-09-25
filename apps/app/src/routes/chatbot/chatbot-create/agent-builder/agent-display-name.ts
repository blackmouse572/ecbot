import type { AgentProfile } from "@repo/agent-blueprint";
import type { TFunction } from "i18next";

/**
 * The `{{name}}` used in "Talk with {{name}}" copy (agentBuilder.ui.tryAgent):
 * the agent's own name once the builder has one, otherwise the generic
 * agentBuilder.ui.yourAgent fallback. Computed once by the caller and passed
 * down, so header/tab/heading labels never duplicate this fallback.
 */
export function agentDisplayName(profile: AgentProfile | null, t: TFunction): string {
  return profile?.agentName.trim() || t("agentBuilder.ui.yourAgent");
}
