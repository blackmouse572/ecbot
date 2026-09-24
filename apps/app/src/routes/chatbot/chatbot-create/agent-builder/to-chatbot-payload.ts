import type { AgentProfile } from "@repo/agent-blueprint";
import type { ChatbotCreateRequestDto } from "@repo/client";
import { CHATBOT_FORM_DEFAULTS } from "../../constants";

/**
 * The full chatbot body for create and update. The update endpoint writes
 * every editable field (unsent ones become undefined), so the builder always
 * sends everything: builder-owned fields from the profile, the rest from
 * `base` (the existing chatbot) or the form defaults.
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
    ...base,
    name: profile.agentName.trim() || profile.businessName.trim() || "Agent",
    type: profile.businessType as ChatbotCreateRequestDto["type"],
    primaryLanguage: language,
    deferedLanguage: base.deferedLanguage ?? language,
    welcomeMessage: profile.greeting,
    agentProfile: profile as unknown as Record<string, unknown>,
    extraInstructions,
  } as ChatbotCreateRequestDto;
}
