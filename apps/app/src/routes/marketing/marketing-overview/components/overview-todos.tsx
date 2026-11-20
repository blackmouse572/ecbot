import type { MarketingOverviewResponseDto } from "@/hooks/api/marketing-overview";
import { useAnalyticsFormat } from "@/routes/dashboard/components/analytics/use-analytics-format";
import { Container, Heading, Skeleton, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { StageIcon } from "../../components/stage-icon";
import { useStageLabel } from "../../components/stage-label";
import { TODO_STAGE } from "../../constants";
import type { StageKey } from "../../types";

type OverviewTodosProps = {
  overview?: MarketingOverviewResponseDto;
  isLoading: boolean;
};

/** "Việc nên làm": one row per stage with the customers worth a message. */
export const OverviewTodos: FC<OverviewTodosProps> = ({
  overview,
  isLoading,
}) => {
  const { t } = useTranslation();
  const f = useAnalyticsFormat();
  const label = useStageLabel();
  const atStage = (stage: StageKey) =>
    overview?.stages.find((s) => s.stage === stage)?.current ?? 0;

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
        <div>
          <Heading level="h2">{t("marketing.overview.todos.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("marketing.overview.todos.description")}
          </Text>
        </div>
        {overview && (
          <div className="flex shrink-0 flex-col sm:items-end">
            <Text size="xlarge" weight="plus" className="tabular-nums">
              {f.number(overview.todoTotal.count)}
            </Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("marketing.overview.todos.total", {
                value: f.number(overview.todoTotal.excluded),
              })}
            </Text>
          </div>
        )}
      </div>
      {isLoading || !overview
        ? Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="px-6 py-4">
              <Skeleton className="h-9 w-full" />
            </div>
          ))
        : overview.todos.map((todo) => {
            const stage = TODO_STAGE[todo.key];
            return (
              <div
                key={todo.key}
                data-testid={`todo-${todo.key}`}
                className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[200px_1fr] md:items-center md:gap-x-6"
              >
                <div className="flex items-center gap-x-3">
                  <StageIcon stage={stage} />
                  <div>
                    <Text size="small" weight="plus" leading="compact">
                      {label(stage)}
                    </Text>
                    {stage !== "DORMANT" && (
                      <Text
                        size="xsmall"
                        className="text-ui-fg-subtle tabular-nums"
                      >
                        {t("marketing.overview.customers", {
                          count: atStage(stage),
                          value: f.number(atStage(stage)),
                        })}
                      </Text>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-y-1">
                  {todo.count > 0 ? (
                    <Text size="base" weight="plus" leading="compact">
                      {t(`marketing.overview.todos.${todo.key}.title`, {
                        value: f.number(todo.count),
                      })}
                    </Text>
                  ) : (
                    <Text size="small" leading="compact">
                      {t("marketing.overview.todos.none")}
                    </Text>
                  )}
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    {t(`marketing.overview.todos.${todo.key}.hint`)}
                    {todo.excluded > 0 &&
                      ` ${t("marketing.overview.todos.excluded", {
                        value: f.number(todo.excluded),
                      })}`}
                  </Text>
                </div>
              </div>
            );
          })}
    </Container>
  );
};
