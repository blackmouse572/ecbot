import type { CustomersAnalytics } from "@/hooks/api/workspace-analytics";
import { Container, Heading, Text } from "@medusajs/ui";
import { SharePie } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TAG_SLICE_COLORS } from "./chart-colors";
import { useAnalyticsFormat } from "./use-analytics-format";

/** How customers split across tags: the biggest groups, the rest as one. */
export const CustomerTagsSection: FC<{
  data: CustomersAnalytics;
  isLoading?: boolean;
}> = ({ data, isLoading }) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const named = TAG_SLICE_COLORS.length - 1;
  const top = data.tags.slice(0, named);
  const rest = data.tags.slice(named).reduce((sum, tag) => sum + tag.count, 0);
  const slices = [
    ...top.map((tag, i) => ({
      key: tag.id,
      label: tag.name,
      icon: tag.emoji,
      count: tag.count,
      color: TAG_SLICE_COLORS[i],
    })),
    ...(rest
      ? [
          {
            key: "other",
            label: t("dashboard.analytics.customers.otherTags"),
            count: rest,
            color: TAG_SLICE_COLORS[named],
          },
        ]
      : []),
  ];

  return (
    <Container className="flex flex-col gap-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading level="h2">
          {t("dashboard.analytics.customers.tagsTitle")}
        </Heading>
        {!isLoading && (
          <Text size="small" className="text-ui-fg-subtle">
            {t("dashboard.analytics.customers.untagged", {
              count: data.untagged,
              share: f.share(data.untagged, data.total),
            })}
          </Text>
        )}
      </div>
      <SharePie
        slices={slices}
        emptyLabel={t("dashboard.analytics.empty")}
        emptyMessage={t("dashboard.analytics.emptyMessage")}
        isLoading={isLoading}
        formatCount={f.number}
        suffix={(slice) => f.share(slice.count, data.total)}
      />
    </Container>
  );
};
