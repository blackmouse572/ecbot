import { useCallback } from "react";
import { useTranslation } from "react-i18next";

const HOUR = 3_600_000;
const MINUTE = 60_000;
const KEY = "conversations.customer.panel.marketing.freeWindow";

/**
 * How long the shop may still message for free: "6 hours", null once the
 * window closed, undefined when the channel has no limit.
 */
export const useFreeWindowLeft = () => {
  const { t } = useTranslation();

  return useCallback(
    (openUntil: string | null | undefined, now = Date.now()) => {
      if (!openUntil) return undefined;
      const left = new Date(openUntil).getTime() - now;

      if (left <= 0) return null;

      return left >= HOUR
        ? t(`${KEY}.hours`, { count: Math.floor(left / HOUR) })
        : t(`${KEY}.minutes`, {
            count: Math.max(1, Math.floor(left / MINUTE)),
          });
    },
    [t],
  );
};
