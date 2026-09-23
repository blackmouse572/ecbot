import { blankToUndefined } from "@/libs/validations";
import { t } from "i18next";
import { z } from "zod/v4";

/** An optional positive integer that a cleared input returns to "unset". */
const optionalPositiveInt = z.preprocess(
  blankToUndefined,
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
  // Preprocessed for the same reason as `optionalPositiveInt`: without it a
  // cleared Temperature coerces to 0 rather than falling back to the default.
  modelTemperature: z.preprocess(
    blankToUndefined,
    z.coerce.number().min(0).max(2).default(1.0),
  ),
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
// What the fields hold before coercion and defaults — `useForm`'s TFieldValues.
export type ChatbotFormInput = z.input<typeof createChatbotSchema>;

export type ChatbotCreateFormData = ChatbotFormData;
export type ChatbotEditFormData = ChatbotFormData;

export const cloneChatbotSchema = z.object({
  name: z.string().min(1, t("errors.chatbot.nameRequired")).max(255),
  cloneTools: z.boolean(),
  cloneKnowledgeItems: z.boolean(),
  cloneRags: z.boolean(),
});

export type CloneChatbotFormData = z.infer<typeof cloneChatbotSchema>;
