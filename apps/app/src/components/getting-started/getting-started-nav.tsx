import { Text } from "@medusajs/ui";
import { Can } from "@repo/auth";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useMatch } from "react-router-dom";
import { ROUTES } from "@/routes/constants";
import { useGettingStartedSteps } from "./use-getting-started-steps";

/**
 * The getting-started checklist in the sidebar, so a new owner sees the next
 * step from every page. Only the next step is linked so the card stays
 * short under the nav. Hidden on the dashboard, which shows the full card,
 * and gone once every step is done.
 */
export const GettingStartedNav: FC = () => {
  const { t } = useTranslation();
  const steps = useGettingStartedSteps();
  const onDashboard = useMatch(`/:workspaceSlug/${ROUTES.Dashboard}`);
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  if (onDashboard || steps.length === 0 || doneCount === steps.length)
    return null;

  return (
    <Can I="manage" a="CHATBOT">
      <section aria-labelledby="getting-started-nav" className="px-3 py-2">
        <div className="bg-ui-bg-base shadow-borders-base flex flex-col gap-y-2 rounded-lg p-3">
          <Text
            id="getting-started-nav"
            size="small"
            weight="plus"
            leading="compact"
          >
            {t("dashboard.gettingStarted.title")}
          </Text>
          <div className="flex items-center gap-x-2">
            <div
              role="progressbar"
              aria-labelledby="getting-started-nav"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneCount}
              className="bg-ui-border-base h-1 flex-1 overflow-hidden rounded-full"
            >
              <span
                className="bg-ui-fg-interactive block h-full rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
            <Text
              size="xsmall"
              leading="compact"
              className="text-ui-fg-muted tabular-nums"
            >
              {t("dashboard.gettingStarted.progress", {
                done: doneCount,
                total: steps.length,
              })}
            </Text>
          </div>
          {next && (
            <Link
              to={next.to}
              className="text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-base-hover -mx-1 flex items-center gap-x-2 rounded-md px-1 py-1 transition-colors"
            >
              <span className="border-ui-border-strong size-[15px] shrink-0 rounded-full border" />
              <Text size="xsmall" leading="compact" weight="plus">
                {t(`dashboard.gettingStarted.steps.${next.key}.title`)}
              </Text>
            </Link>
          )}
        </div>
      </section>
    </Can>
  );
};
