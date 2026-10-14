import { clx } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { GUIDE_BACKGROUND } from "./constants";
import type { GuideFeature } from "./types";

interface FeatureArtProps {
  feature: GuideFeature;
  /** The page's own icon, shown as the agent's avatar. */
  icon: ReactNode;
  className?: string;
}

/**
 * A small scene for a feature: a customer's question and the agent's answer
 * on a landing-page gradient, so the page shows what it does for the shop
 * before it has data. Decorative; the text beside it says the same.
 */
export const FeatureArt: FC<FeatureArtProps> = ({
  feature,
  icon,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div
      aria-hidden
      className={clx(
        "relative w-full max-w-[320px] overflow-hidden rounded-xl",
        className,
      )}
    >
      <img
        src={GUIDE_BACKGROUND[feature]}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="relative flex min-h-28 flex-col justify-center gap-y-2 px-4 py-3">
        <span className="bg-ui-bg-base/90 text-ui-fg-base txt-compact-xsmall shadow-elevation-card-rest max-w-[85%] self-start rounded-2xl rounded-bl-sm px-3 py-1.5">
          {t(`guide.features.${feature}.customer`)}
        </span>
        <div className="flex max-w-[90%] items-end gap-x-2 self-end">
          <span className="bg-ui-bg-base text-ui-fg-base txt-compact-xsmall shadow-elevation-card-rest rounded-2xl rounded-br-sm px-3 py-1.5">
            {t(`guide.features.${feature}.agent`)}
          </span>
          <span className="bg-ui-bg-base text-ui-fg-interactive shadow-elevation-card-rest flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-4">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};
