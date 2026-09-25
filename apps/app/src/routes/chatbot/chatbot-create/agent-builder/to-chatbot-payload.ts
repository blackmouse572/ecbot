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
 *
 * `accounts` is always `[]`, regardless of `base` (fix round 3): account
 * membership never travels through this payload. It changes only through
 * the guarded link/unlink endpoints (apps/api ChatbotService.linkBatchAccounts
 * checks ownership; this payload has no way to). Sending a non-empty array
 * here would replace the chatbot's whole linked-accounts set server side;
 * exactly the race this rule removes by construction, not by timing.
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
    accounts: [],
    name: base.name ?? (profile.agentName.trim() || profile.businessName.trim() || "Agent"),
    type: profile.businessType as ChatbotCreateRequestDto["type"],
    primaryLanguage: base.primaryLanguage ?? language,
    deferedLanguage: base.deferedLanguage ?? language,
    welcomeMessage: profile.greeting.trim() ? profile.greeting : (base.welcomeMessage ?? ""),
    agentProfile: profile as unknown as Record<string, unknown>,
    extraInstructions,
  } as ChatbotCreateRequestDto;
}
