import { useEffect } from "react";
import { useCookies } from "react-cookie";
import { useTranslation } from "react-i18next";

const LANGUAGE_KEY = "medusa_admin_language";

export const useLanguagePreferences = () => {
  const { i18n } = useTranslation();
  const [cookies, setCookie] = useCookies([LANGUAGE_KEY]);

  // Initialize language from cookie or browser preference
  useEffect(() => {
    const savedLanguage = cookies[LANGUAGE_KEY];
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    } else if (!savedLanguage) {
      // If no saved language, save the current language to cookies
      setCookie(LANGUAGE_KEY, i18n.language, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60, // 1 year
      });
    }
  }, [cookies, i18n, setCookie]);

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    setCookie(LANGUAGE_KEY, language, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });
  };

  return {
    currentLanguage: i18n.language,
    changeLanguage,
  };
};
