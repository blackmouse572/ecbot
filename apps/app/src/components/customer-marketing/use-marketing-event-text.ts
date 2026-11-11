import type { MarketingEventGetResponseDto } from "@repo/client";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MARKETING_REASON_CODES } from "./constants";

const isReasonCode = (
  reason: string,
): reason is (typeof MARKETING_REASON_CODES)[number] =>
  (MARKETING_REASON_CODES as readonly string[]).includes(reason);

/** Turns a label change into the words the timeline shows. */
export const useMarketingEventText = () => {
  const { t } = useTranslation();

  return useCallback(
    (event: MarketingEventGetResponseDto) => {
      const change = (layer: "stage" | "permission") => {
        const to = t(`customerMarketing.${layer}.${event.newValue}`);

        return event.oldValue
          ? t(`customerMarketing.event.${layer}Changed`, {
              from: t(`customerMarketing.${layer}.${event.oldValue}`),
              to,
            })
          : t(`customerMarketing.event.${layer}Set`, { to });
      };

      const titles: Record<MarketingEventGetResponseDto["kind"], () => string> =
        {
          STAGE: () => change("stage"),
          PERMISSION: () => change("permission"),
          CONSENT_ASKED: () => t("customerMarketing.event.consentAsked"),
          HOSTILE: () =>
            event.newValue === "true"
              ? t("customerMarketing.event.hostileOn")
              : t("customerMarketing.event.hostileOff"),
        };

      const reason = event.reason
        ? isReasonCode(event.reason)
          ? t(`customerMarketing.reasonCode.${event.reason}`)
          : event.reason
        : null;

      return {
        title: titles[event.kind](),
        reason,
        actor: t(`customerMarketing.actor.${event.actor}`),
      };
    },
    [t],
  );
};
