import { clx } from "@medusajs/ui";
import { IconAvatar } from "@repo/ui/common-components";
import {
  IconEye,
  IconMessageCircle,
  IconMoon,
  IconRepeat,
  IconShoppingBag,
  IconTag,
} from "@tabler/icons-react";
import type { FC, ReactNode } from "react";
import { STAGE_ICON_CLASS, STAGE_TONE } from "../constants";
import type { StageKey } from "../types";

const ICONS: Record<StageKey, ReactNode> = {
  NEW: <IconMessageCircle />,
  INTERESTED: <IconEye />,
  ASKED_PRICE: <IconTag />,
  BOUGHT_ONCE: <IconShoppingBag />,
  BOUGHT_REPEAT: <IconRepeat />,
  DORMANT: <IconMoon />,
};

export const StageIcon: FC<{ stage: StageKey }> = ({ stage }) => (
  <IconAvatar size="large">
    <div
      className={clx(
        "flex size-full items-center justify-center [&>svg]:size-4",
        STAGE_ICON_CLASS[STAGE_TONE[stage]],
      )}
    >
      {ICONS[stage]}
    </div>
  </IconAvatar>
);
