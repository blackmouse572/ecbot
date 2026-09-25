import type { AgentProfile } from "@repo/agent-blueprint";
import type { ChatbotCreateRequestDto } from "@repo/client";
import { CHATBOT_FORM_DEFAULTS } from "../../constants";

// Mirrors ChatbotEntity's own default (apps/api chatbot.entity.ts). The
// column is non-nullable, and the update endpoint turns every unsent
// editable field into `undefined`, so it must always be sent.
export const CHATBOT_HANDOFF_FALLBACK_THRESHOLD_DEFAULT = 3;

/**
 * The full chatbot body for create and update. The update endpoint writes
 * every editable field (unsent ones become undefined), so the builder always
 * sends everything: builder-owned fields (type, agentProfile,
 * extraInstructions) from the profile, the rest from `base` (the existing
 * chatbot) or the form defaults. Name, languages and the welcome message are
 * derived from the profile only when `base` has none, so settings edited
 * elsewhere survive reopening the builder.
 */
export function toChatbotPayload(
  profile: AgentProfile,
  extraInstructions: string,
  base: Partial<ChatbotCreateRequestDto> = {},
): ChatbotCreateRequestDto {
  const language = profile.primaryLanguage as ChatbotCreateRequestDto["primaryLanguage"];
  return {
    autoRead: CHATBOT_FORM_DEFAULTS.autoRead,
    typingIndicator: CHATBOT_FORM_DEFAULTS.typingIndicator,
    accounts: [],
    modelTextName: CHATBOT_FORM_DEFAULTS.modelTextName,
    modelTemperature: CHATBOT_FORM_DEFAULTS.modelTemperature,
    fallbackMessage: "",
    guardrailEnabled: CHATBOT_FORM_DEFAULTS.guardrailEnabled,
    guardrailModelEnabled: CHATBOT_FORM_DEFAULTS.guardrailModelEnabled,
    guardrailCustomInstruction: "",
    guardrailEscalateOnBlock: CHATBOT_FORM_DEFAULTS.guardrailEscalateOnBlock,
    followupRules: "",
    handoffFallbackThreshold: CHATBOT_HANDOFF_FALLBACK_THRESHOLD_DEFAULT,
    ...base,
    name: base.name ?? (profile.agentName.trim() || profile.businessName.trim() || "Agent"),
    type: profile.businessType as ChatbotCreateRequestDto["type"],
    primaryLanguage: base.primaryLanguage ?? language,
    deferedLanguage: base.deferedLanguage ?? language,
    welcomeMessage: profile.greeting.trim() ? profile.greeting : (base.welcomeMessage ?? ""),
    agentProfile: profile as unknown as Record<string, unknown>,
    extraInstructions,
  } as ChatbotCreateRequestDto;
}
