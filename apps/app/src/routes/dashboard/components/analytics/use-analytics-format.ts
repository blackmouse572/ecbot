import { useTranslation } from "react-i18next";

/** Number formats for the dashboard in the reader's language. */
export function useAnalyticsFormat() {
  const { i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  const compact = new Intl.NumberFormat(i18n.language, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const decimal = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 1,
  });
  return {
    number: (v: number) => number.format(v),
    compact: (v: number) => compact.format(v),
    percent: (v: number) => `${decimal.format(v)}%`,
    /** Share of `total` in whole percent, "0%" with no total. */
    share: (v: number, total: number) =>
      `${total ? Math.round((v / total) * 100) : 0}%`,
    decimal: (v: number) => decimal.format(v),
  };
}
