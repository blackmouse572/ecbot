import { Badge } from "@medusajs/ui";
import type { FC } from "react";
import { STAGE_TONE } from "../constants";
import type { StageKey } from "../types";
import { useStageLabel } from "./stage-label";

export const StageTag: FC<{ stage: StageKey }> = ({ stage }) => {
  const label = useStageLabel();
  return (
    <Badge
      size="2xsmall"
      rounded="full"
      color={STAGE_TONE[stage]}
      className="whitespace-nowrap"
    >
      {label(stage)}
    </Badge>
  );
};
