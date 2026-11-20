import { useMarketingOverview } from "@/hooks/api/marketing-overview";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
} from "@/hooks/api/workspace-analytics";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Container, Heading, Select, Text } from "@medusajs/ui";
import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { OverviewFunnel } from "./components/overview-funnel";
import { OverviewHealth } from "./components/overview-health";
import { OverviewMoves } from "./components/overview-moves";
import { OverviewStages } from "./components/overview-stages";
import { OverviewTodos } from "./components/overview-todos";
import { useOverviewRange } from "./use-overview-range";

/** Tổng quan tiếp thị (#502): read-only until sending ships. */
export const MarketingOverview = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { range, days, setRange } = useOverviewRange();
  const { overview, isLoading, isError, error } = useMarketingOverview(
    workspaceSlug,
    range,
  );

  if (isError) {
    throw error;
  }

  const props = { overview, isLoading };
  const ranged = { ...props, days };

  return (
    <SingleColumnPage>
      <Helmet>
        <title>{t("marketing.overview.title")} - Ecbot</title>
      </Helmet>
      <Container className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h1">{t("marketing.overview.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("marketing.overview.description")}
          </Text>
        </div>
        <Select
          size="small"
          value={range}
          onValueChange={(value) => setRange(value as AnalyticsRange)}
        >
          <Select.Trigger
            className="w-[160px]"
            aria-label={t("marketing.overview.range")}
          >
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
      </Container>
      <OverviewTodos {...props} />
      <OverviewFunnel {...props} />
      <OverviewStages {...props} />
      <OverviewMoves {...ranged} />
      <OverviewHealth {...ranged} />
    </SingleColumnPage>
  );
};
