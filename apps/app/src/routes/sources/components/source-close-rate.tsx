import type { TrackedLinkStatsResponseDto } from "@/hooks/api/tracked-links";
import { Text } from "@medusajs/ui";
import { Meter } from "@repo/ui/components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { closeRatePercent, formatRate } from "../utils";

type SourceCloseRateProps = {
  stats?: TrackedLinkStatsResponseDto;
  /** The list page shows a bar next to the number; this rate fills it. */
  barMax?: number;
};

/** "Tỉ lệ chốt" as a percent, with a dash before the first customer. */
export const SourceCloseRate: FC<SourceCloseRateProps> = ({
  stats,
  barMax,
}) => {
  const { t, i18n } = useTranslation();
  const rate = closeRatePercent(stats);
  const label = t("customerSources.columns.closeRate");

  if (rate === null) {
    return (
      <Text
        size="small"
        className={
          barMax ? "w-[124px] text-right text-ui-fg-muted" : "text-ui-fg-muted"
        }
      >
        –
      </Text>
    );
  }

  const text = formatRate(rate, i18n.language);

  if (!barMax) {
    return (
      <Text size="small" className="tabular-nums">
        {text}
      </Text>
    );
  }

  return (
    <Meter
      value={Math.min(rate, barMax)}
      max={barMax}
      aria-label={label}
      aria-valuetext={text}
      className="flex-row items-center gap-x-3"
    >
      <Meter.Track className="h-1.5 w-14">
        <Meter.Indicator />
      </Meter.Track>
      <Text size="small" className="w-12 text-right tabular-nums">
        {text}
      </Text>
    </Meter>
  );
};
