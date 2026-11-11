import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/** "15/4": the day a pause ends, with the year only when it is not this year. */
export const useMarketingDay = () => {
  const { i18n } = useTranslation();

  return useCallback(
    (value: string) => {
      const date = new Date(value);
      const sameYear = date.getFullYear() === new Date().getFullYear();

      return new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "numeric",
        year: sameYear ? undefined : "numeric",
      }).format(date);
    },
    [i18n.language],
  );
};
