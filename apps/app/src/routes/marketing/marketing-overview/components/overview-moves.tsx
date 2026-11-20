import type { MarketingOverviewResponseDto } from "@/hooks/api/marketing-overview";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { ArrowRightMini } from "@medusajs/icons";
import { Button, Container, Heading, Skeleton, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { StageTag } from "../../components/stage-tag";
import { customersAtStage } from "../../utils";

type OverviewMovesProps = {
  overview?: MarketingOverviewResponseDto;
  isLoading: boolean;
  /** Length of the range the comparison covers. */
  days: number;
};

/** Moves between stages within the range, the largest first. */
export const OverviewMoves: FC<OverviewMovesProps> = ({
  overview,
  isLoading,
  days,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const { workspaceSlug } = useWorkspaceParams();
  const moves = overview?.moves ?? [];

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">
          {t("marketing.overview.moves.title", { days })}
        </Heading>
      </div>
      {isLoading ? (
        <div className="px-6 py-4">
          <Skeleton className="h-6 w-full" />
        </div>
      ) : moves.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("marketing.overview.moves.empty", { days })}
          </Text>
        </div>
      ) : (
        moves.map((move) => (
          <div
            key={`${move.from}-${move.to}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3"
          >
            <Text
              size="small"
              className="shrink-0 whitespace-nowrap tabular-nums"
            >
              {t("marketing.overview.customers", {
                count: move.count,
                value: f.number(move.count),
              })}
            </Text>
            <div className="flex shrink-0 items-center gap-x-1.5">
              <StageTag stage={move.from} />
              <ArrowRightMini className="text-ui-fg-muted" />
              <StageTag stage={move.to} />
            </div>
            <Button
              size="small"
              variant="transparent"
              className="ml-auto"
              asChild
            >
              <Link to={customersAtStage(workspaceSlug, move.to)}>
                {t("marketing.overview.moves.view")}
              </Link>
            </Button>
          </div>
        ))
      )}
    </Container>
  );
};
