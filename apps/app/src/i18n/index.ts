import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { languages } from "./languages";
import agentBuilderEn from "@repo/agent-blueprint/locales/en.json";
import agentBuilderVi from "@repo/agent-blueprint/locales/vi.json";
import enUS from "./translations/en.json";
import viVn from "./translations/vi.json";

// The builder's copy lives with the builder questions, so the admin site can
// show an agent's answers with the same words.
export const resources = {
  en: {
    translation: { ...enUS, agentBuilder: agentBuilderEn },
  },
  vi: {
    translation: { ...viVn, agentBuilder: agentBuilderVi },
  },
} as const;

export const defaultNs = "translation";

// Function to get initial language from cookies
const getInitialLanguage = (): string => {
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key && value) {
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    const savedLanguage = cookies["medusa_admin_language"];
    if (
      savedLanguage &&
      languages.some((lang) => lang.code === savedLanguage)
    ) {
      return savedLanguage;
    }
  }

  // Fallback to browser language or default
  const browserLang =
    typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en";
  return languages.some((lang) => lang.code === browserLang)
    ? browserLang
    : "en";
};

i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: languages.map((lang) => lang.code),
  resources,
  interpolation: {
    skipOnVariables: false,
    // React already escapes rendered text; escaping here double-encodes "&" etc.
    escapeValue: false,
  },
});

export default i18n;
