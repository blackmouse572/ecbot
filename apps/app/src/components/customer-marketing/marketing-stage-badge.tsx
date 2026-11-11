import { Badge, clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { STAGE_BADGE_COLOR } from "./constants";
import type { CustomerStage } from "./types";

type Props = {
  stage: CustomerStage;
  // Lâu không nhắn shows instead of the stage, which the tooltip keeps.
  dormant?: boolean;
  className?: string;
};

/** The journey stage as a Badge. */
export const MarketingStageBadge: FC<Props> = ({
  stage,
  dormant,
  className,
}) => {
  const { t } = useTranslation();
  const stageLabel = t(`customerMarketing.stage.${stage}`);

  return (
    <Badge
      size="2xsmall"
      rounded="full"
      color={dormant ? "grey" : STAGE_BADGE_COLOR[stage]}
      title={dormant ? stageLabel : undefined}
      className={clx("self-start whitespace-nowrap", className)}
    >
      {dormant ? t("customerMarketing.dormant") : stageLabel}
    </Badge>
  );
};
