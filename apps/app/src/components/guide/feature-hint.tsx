import { Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FeatureArt } from "./feature-art";
import type { GuideFeature } from "./types";

export interface FeatureHintProps {
  feature: GuideFeature;
  icon: ReactNode;
}

/** What a page does for the shop, shown beside its sidebar link. */
export const FeatureHint: FC<FeatureHintProps> = ({ feature, icon }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-col gap-y-1 px-4 py-3">
        <Text size="small" weight="plus" leading="compact">
          {t(`guide.features.${feature}.title`)}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {t(`guide.features.${feature}.body`)}
        </Text>
      </div>
      {/* Text first, so the card's arrow points at the title. */}
      <FeatureArt
        feature={feature}
        icon={icon}
        className="max-w-none rounded-none"
      />
    </>
  );
};
