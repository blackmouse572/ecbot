// Every editable field the update endpoint accepts, excluding the token
// caps (not editable here). Kept as an explicit list so an unsent field is
// still picked as `undefined` rather than dropped by a rest spread.
export const CHATBOT_EDITABLE_FIELDS = [
    'name',
    'accounts',
    'avatar',
    'generalKnowledge',
    'type',
    'autoRead',
    'typingIndicator',
    'modelTextName',
    'primaryLanguage',
    'deferedLanguage',
    'welcomeMessage',
    'fallbackMessage',
    'modelTemperature',
    'maxTokens',
    'guardrailEnabled',
    'guardrailModelEnabled',
    'guardrailCustomInstruction',
    'guardrailEscalateOnBlock',
    'handoffFallbackThreshold',
    'handoffMessage',
    'handoffKeywords',
    'followupRules',
] as const;
