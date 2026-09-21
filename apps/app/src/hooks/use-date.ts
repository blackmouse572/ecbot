import { languages } from "@/i18n/languages";
import { format, formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
export function useDate() {
  const { i18n } = useTranslation();
  const getFullDate = useCallback(
    (
      date:
        | Date
        | {
            date: Date;
            includeTime?: boolean;
          },
    ) => {
      const locale = languages.find(
        (lang) => lang.code === i18n.language,
      )?.date_locale;
      // Extract date and options
      const isDateWithOptions = typeof date === "object" && "date" in date;
      const actualDate = isDateWithOptions
        ? new Date(date.date)
        : new Date(date);
      const includeTime = isDateWithOptions && date.includeTime;

      // Format based on locale and options
      if (!locale) {
        return includeTime
          ? actualDate.toLocaleString()
          : actualDate.toLocaleDateString();
      }

      return format(actualDate, includeTime ? "PPpp" : "PP", { locale });
    },
    [i18n.language],
  );

  const getRelativeDate = useCallback(
    (date: Date) => {
      const locale = languages.find(
        (lang) => lang.code === i18n.language,
      )?.date_locale;
      return formatDistanceToNow(date, { locale });
    },
    [i18n.language],
  );

  const getRelativeDateOrFullDate = useCallback(
    (
      date: Date,
      options?: {
        maxTime?: number;
        includeTime?: boolean;
      },
    ) => {
      const { maxTime = 24 * 60 * 60 * 1000, includeTime = false } =
        options || {};
      const locale = languages.find(
        (lang) => lang.code === i18n.language,
      )?.date_locale;
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      if (diff > maxTime) {
        return format(date, includeTime ? "PPpp" : "PP", { locale });
      }
      return formatDistanceToNow(date, { locale, includeSeconds: includeTime });
    },
    [i18n.language],
  );

  return {
    getFullDate,
    getRelativeDate,
    getRelativeDateOrFullDate,
  };
}
