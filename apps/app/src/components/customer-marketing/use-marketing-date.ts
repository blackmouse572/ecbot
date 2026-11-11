import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/** "11:22 10/11": short enough for the narrow customer panel. */
export const useMarketingDate = () => {
  const { i18n } = useTranslation();

  return useCallback(
    (value: string) => {
      const date = new Date(value);
      const sameYear = date.getFullYear() === new Date().getFullYear();

      return new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "numeric",
        year: sameYear ? undefined : "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    [i18n.language],
  );
};
