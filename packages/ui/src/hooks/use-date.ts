import { format, formatDistanceToNow, type Locale } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

// The languages every consumer app ships. Kept package-local so @repo/ui has no
// dependency on any app's i18n module.
//
// An unmapped language never throws, but it does not degrade uniformly:
// `getFullDate` falls back to the platform's own formatting (see below), while
// the two relative-date helpers hand `undefined` to date-fns, which defaults to
// en-US. Adding a language to an app without adding it here is therefore silent.
const DATE_LOCALES: Record<string, Locale | undefined> = { en: enUS, vi };

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
      const locale = DATE_LOCALES[i18n.language];
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
      const locale = DATE_LOCALES[i18n.language];
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
      const locale = DATE_LOCALES[i18n.language];
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
