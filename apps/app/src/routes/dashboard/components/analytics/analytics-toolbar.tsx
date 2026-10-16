import type { AnalyticsRange } from "@/hooks/api/workspace-analytics";
import { ANALYTICS_RANGES } from "@/hooks/api/workspace-analytics";
import { ArrowPath } from "@medusajs/icons";
import { Heading, IconButton, Select, Text, Tooltip } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type AnalyticsToolbarProps = {
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  generatedAt?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
};

/** Page title, the period picker, and when the numbers were counted. */
export const AnalyticsToolbar: FC<AnalyticsToolbarProps> = ({
  range,
  onRangeChange,
  generatedAt,
  onRefresh,
  isRefreshing,
}) => {
  const { t, i18n } = useTranslation();
  const time = generatedAt
    ? new Intl.DateTimeFormat(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(generatedAt))
    : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Heading level="h1">{t("app.nav.dashboard.header")}</Heading>
        {time && (
          <Text size="small" className="text-ui-fg-subtle">
            {t("dashboard.analytics.updatedAt", { time })}
          </Text>
        )}
      </div>
      <div className="flex items-center gap-x-2">
        <Select
          size="small"
          value={range}
          onValueChange={(value) => onRangeChange(value as AnalyticsRange)}
        >
          <Select.Trigger className="w-[160px]">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {ANALYTICS_RANGES.map((value) => (
              <Select.Item key={value} value={value}>
                {t(`dashboard.analytics.range.${value}`)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Tooltip content={t("dashboard.analytics.refresh")}>
          <IconButton
            size="small"
            variant="secondary"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={t("dashboard.analytics.refresh")}
          >
            <ArrowPath className={isRefreshing ? "animate-spin" : undefined} />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};
