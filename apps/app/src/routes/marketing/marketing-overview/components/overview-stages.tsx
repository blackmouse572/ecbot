import type { MarketingOverviewResponseDto } from "@/hooks/api/marketing-overview";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { StatCard } from "@repo/ui/charts";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useStageLabel } from "../../components/stage-label";
import { JOURNEY_STAGES } from "../../constants";
import type { StageKey } from "../../types";
import { customersAtStage } from "../../utils";

type OverviewStagesProps = {
  overview?: MarketingOverviewResponseDto;
  isLoading: boolean;
};

/** One card per stage against the start of the range; each opens the customer list. */
export const OverviewStages: FC<OverviewStagesProps> = ({
  overview,
  isLoading,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const label = useStageLabel();
  const { workspaceSlug } = useWorkspaceParams();
  const total = overview?.total ?? 0;
  const cards: {
    stage: StageKey;
    current?: number;
    previous?: number;
    hint: string;
  }[] = [
    // Every card renders while loading, so the grid keeps its size.
    ...JOURNEY_STAGES.map((stage) => {
      const s = overview?.stages.find((row) => row.stage === stage);
      return {
        stage,
        current: s?.current,
        previous: s?.previous,
        hint: t("marketing.overview.stages.share", {
          share: f.share(s?.current ?? 0, total),
        }),
      };
    }),
    {
      stage: "DORMANT",
      current: overview?.dormant,
      hint: t("marketing.overview.stages.dormantHint"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Link
          key={card.stage}
          to={customersAtStage(workspaceSlug, card.stage)}
          className="focus-visible:shadow-borders-focus rounded-lg outline-none"
        >
          <StatCard
            label={label(card.stage)}
            current={card.current}
            previous={card.previous}
            format={f.number}
            hint={card.hint}
            lowerIsBetter={card.stage === "DORMANT"}
            isLoading={isLoading}
          />
        </Link>
      ))}
    </div>
  );
};
