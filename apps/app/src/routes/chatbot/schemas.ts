import { t } from "i18next";
import { z } from "zod/v4";

/**
 * An optional positive integer that a cleared input returns to "unset".
 *
 * `z.coerce.number()` maps `""` to `0` (Number("") === 0), which then fails
 * `.positive()` — so typing a value and deleting it left the field stuck on a
 * validation error with no way back to empty, contradicting the "leave empty
 * for no limit" hint.
 */
const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const createChatbotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, t("errors.chatbot.nameRequired")).max(255),
  generalKnowledge: z.string().max(10000).default(""),
  accounts: z.array(z.string()).default([]),
  type: z.string().default("beauty"),
  autoRead: z.boolean().default(true),
  typingIndicator: z.boolean().default(true),
  primaryLanguage: z
    .string()
    .min(1, t("errors.chatbot.primaryLanguageRequired"))
    .default("en"),
  deferedLanguage: z.string().nullish(),
  welcomeMessage: z.string().max(1000).nullish(),
  fallbackMessage: z.string().max(1000).nullish(),
  modelTextName: z
    .string()
    .min(1, t("errors.chatbot.modelTextNameRequired"))
    .default("google/gemini-2.5-flash"),
  modelTemperature: z.coerce.number().min(0).max(2).default(1.0),
  maxTokens: optionalPositiveInt,
  handoffMessage: z.string().max(1000).nullish(),
  handoffKeywords: z.array(z.string()).nullish().default([]),
  handoffFallbackThreshold: optionalPositiveInt,
  guardrailEnabled: z.boolean().default(false),
  guardrailModelEnabled: z.boolean().default(false),
  guardrailCustomInstruction: z.string().max(2000).nullish(),
  guardrailEscalateOnBlock: z.boolean().default(true),
  followupRules: z.string().max(2000).nullish(),
});

export type ChatbotFormData = z.infer<typeof createChatbotSchema>;

export type ChatbotCreateFormData = ChatbotFormData;
export type ChatbotEditFormData = ChatbotFormData;

export const cloneChatbotSchema = z.object({
  name: z.string().min(1, t("errors.chatbot.nameRequired")).max(255),
  cloneTools: z.boolean(),
  cloneKnowledgeItems: z.boolean(),
  cloneRags: z.boolean(),
});

export type CloneChatbotFormData = z.infer<typeof cloneChatbotSchema>;
