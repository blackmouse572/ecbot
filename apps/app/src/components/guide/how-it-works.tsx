import { InformationCircle } from "@medusajs/icons";
import { Button, Popover, Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FeatureArt } from "./feature-art";
import type { GuideFeature } from "./types";

interface HowItWorksProps {
  feature: GuideFeature;
  icon: ReactNode;
}

/** A "How it works" button beside a page title, which stays after the page
 * has data, so the explanation is never lost with the empty state. */
export const HowItWorks: FC<HowItWorksProps> = ({ feature, icon }) => {
  const { t } = useTranslation();

  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button
          size="small"
          variant="transparent"
          className="text-ui-fg-subtle"
        >
          <InformationCircle />
          {t("guide.howItWorks")}
        </Button>
      </Popover.Trigger>
      <Popover.Content
        align="start"
        className="w-[300px] max-w-[calc(100vw-32px)] overflow-hidden p-0"
      >
        <FeatureArt
          feature={feature}
          icon={icon}
          className="max-w-none rounded-none"
        />
        <div className="flex flex-col gap-y-1 px-4 py-3">
          <Text size="small" weight="plus" leading="compact">
            {t(`guide.features.${feature}.title`)}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {t(`guide.features.${feature}.body`)}
          </Text>
        </div>
      </Popover.Content>
    </Popover>
  );
};
