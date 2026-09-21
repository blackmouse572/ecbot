// Chatbot management constants and configurations

import i18n from "@/i18n";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import type { ChatbotFormData } from "./schemas";

export const CHATBOT_CONSTANTS = {
  PAGE_SIZE: 20,
  ACCOUNTS_PER_PAGE: 50,
  DEFAULT_ACCOUNTS_PAGE: 1,
};

export const CHATBOT_LANGUAGES = {
  ar: "Arabic",
  bn: "Bengali",
  bg: "Bulgarian",
  zh: "Chinese",
  hr: "Croatian",
  cs: "Czech",
  da: "Danish",
  nl: "Dutch",
  en: "English",
  et: "Estonian",
  fi: "Finnish",
  fr: "French",
  de: "German",
  el: "Greek",
  he: "Hebrew",
  hi: "Hindi",
  hu: "Hungarian",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  lv: "Latvian",
  lt: "Lithuanian",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sr: "Serbian",
  sk: "Slovak",
  sl: "Slovenian",
  es: "Spanish",
  sw: "Swahili",
  sv: "Swedish",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  vi: "Vietnamese",
} as const;

export const CHATBOT_MODEL_PROVIDERS = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
} as const;

export const CHATBOT_STATUS_CONFIG: Record<
  ChatbotGetDetailResponseDto["status"],
  {
    label: string;
    color: "green" | "grey";
  }
> = {
  active: {
    label: i18n.t("chatbot.list.columns.statusOptions.active"),
    color: "green" as const,
  },
  inactive: {
    label: i18n.t("chatbot.list.columns.statusOptions.active"),
    color: "grey" as const,
  },
  archived: {
    label: i18n.t("chatbot.list.columns.statusOptions.archived"),
    color: "grey" as const,
  },
} as const;

export type ChatbotTypeColor =
  "green" | "red" | "blue" | "orange" | "grey" | "purple";

export interface ChatbotTypeConfigItem {
  label: string;
  color: ChatbotTypeColor;
  icon: string; // icon name from Medusa or Tabler
}

export const CHATBOT_TYPE_CONFIG: Record<
  ChatbotGetDetailResponseDto["type"],
  {
    label: string;
    color: ChatbotTypeColor;
    icon: string; // icon name from Medusa or Tabler
  }
> = {
  beauty: {
    label: i18n.t("chatbot.list.columns.typeOptions.beauty"),
    color: "purple",
    icon: "IconHeartbeat", // Tabler: Heart
  },
  fashion: {
    label: i18n.t("chatbot.list.columns.typeOptions.fashion"),
    color: "purple",
    icon: "IconShirt", // Tabler: Shirt
  },
  restaurant: {
    label: i18n.t("chatbot.list.columns.typeOptions.restaurant"),
    color: "red",
    icon: "IconToolsKitchen2", // Tabler: ToolsKitchen2
  },
  ecommerce: {
    label: i18n.t("chatbot.list.columns.typeOptions.ecommerce"),
    color: "blue",
    icon: "IconShoppingCart", // Tabler: ShoppingCart
  },
  healthcare: {
    label: i18n.t("chatbot.list.columns.typeOptions.healthcare"),
    color: "green",
    icon: "IconHeartbeat", // Tabler: Heartbeat
  },
  finance: {
    label: i18n.t("chatbot.list.columns.typeOptions.finance"),
    color: "green",
    icon: "IconCurrencyDollar", // Tabler: CurrencyDollar
  },
  education: {
    label: i18n.t("chatbot.list.columns.typeOptions.education"),
    color: "orange",
    icon: "IconBook", // Tabler: Book
  },
  travel: {
    label: i18n.t("chatbot.list.columns.typeOptions.travel"),
    color: "blue",
    icon: "IconPlane", // Tabler: Plane
  },
  spa: {
    label: i18n.t("chatbot.list.columns.typeOptions.spa"),
    color: "purple",
    icon: "IconMassage", // Tabler: Massage
  },
  fitness: {
    label: i18n.t("chatbot.list.columns.typeOptions.fitness"),
    color: "green",
    icon: "IconBarbell", // Tabler: Barbell
  },
  automotive: {
    label: i18n.t("chatbot.list.columns.typeOptions.automotive"),
    color: "orange",
    icon: "IconCar", // Tabler: Car
  },
  real_estate: {
    label: i18n.t("chatbot.list.columns.typeOptions.real_estate"),
    color: "blue",
    icon: "IconBuildingSkyscraper", // Tabler: BuildingSkyscraper
  },
  entertainment: {
    label: i18n.t("chatbot.list.columns.typeOptions.entertainment"),
    color: "purple",
    icon: "IconMusic", // Tabler: Music
  },
  other: {
    label: i18n.t("chatbot.list.columns.typeOptions.other"),
    color: "grey",
    icon: "IconDots", // Tabler: Dots
  },
} as const;

export const CHATBOT_FORM_DEFAULTS: Partial<ChatbotFormData> = {
  name: "Bot " + new Date().getTime(),
  autoRead: true,
  typingIndicator: true,
  generalKnowledge: "",
  accounts: [],
  primaryLanguage: "en",
  deferedLanguage: "en",
  welcomeMessage: "",
  fallbackMessage: "",
  type: "beauty",
  modelTextName: "google/gemini-2.5-flash",
  modelTemperature: 1.0,
  guardrailEnabled: false,
  guardrailModelEnabled: false,
  guardrailCustomInstruction: "",
  guardrailEscalateOnBlock: true,
  followupRules: "",
};
