import type { ProductGroupGetResponseDto } from "@/hooks/api/product-groups";
import { Badge, Text } from "@medusajs/ui";
import { Meter } from "@repo/ui/components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ORDER_CONSTANTS } from "../constants";

/**
 * Frame 14d's "Ecbot học được": the learned cycle and the repurchases behind
 * it, or how many more repurchases it still needs.
 */
export const LearnedCycleCell: FC<{ group: ProductGroupGetResponseDto }> = ({
  group,
}) => {
  const { t } = useTranslation();
  const pairs = group.repurchasePairs ?? 0;
  const min = ORDER_CONSTANTS.LEARNED_CYCLE_MIN_PAIRS;

  if (group.learnedRepurchaseDays) {
    return (
      <span className="flex items-center gap-x-1.5">
        <Badge size="2xsmall" color="green" className="tabular-nums">
          {t("orders.groups.days", { count: group.learnedRepurchaseDays })}
        </Badge>
        <Text size="xsmall" className="text-ui-fg-subtle tabular-nums">
          {t("orders.groups.fromPairs", { count: pairs })}
        </Text>
      </span>
    );
  }

  // Enough pairs but nothing learned: the cycle is refreshed on the next order.
  if (pairs >= min) {
    return (
      <span className="txt-compact-small text-ui-fg-muted">
        {t("orders.groups.notLearned")}
      </span>
    );
  }

  const needed = t("orders.groups.needPairs", { count: min - pairs });

  return (
    <span className="flex items-center gap-x-2">
      <Meter value={pairs} max={min} aria-label={needed} className="w-16">
        <Meter.Track className="h-1">
          <Meter.Indicator className="bg-ui-fg-muted" />
        </Meter.Track>
      </Meter>
      <Text size="xsmall" className="text-ui-fg-subtle tabular-nums">
        {needed}
      </Text>
    </span>
  );
};
