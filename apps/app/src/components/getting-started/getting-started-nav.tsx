import { CheckCircleSolid, CircleMiniSolid } from "@medusajs/icons";
import { Text } from "@medusajs/ui";
import { Can } from "@repo/auth";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useMatch } from "react-router-dom";
import { ROUTES } from "@/routes/constants";
import { useGettingStartedSteps } from "./use-getting-started-steps";

/**
 * The getting-started checklist in the sidebar, so a new owner sees the next
 * step from every page; each step still to do links to where it is done.
 * Hidden on the dashboard, which shows the full card,
 * and gone once every step is done.
 */
export const GettingStartedNav: FC = () => {
  const { t } = useTranslation();
  const steps = useGettingStartedSteps();
  const onDashboard = useMatch(`/:workspaceSlug/${ROUTES.Dashboard}`);
  const doneCount = steps.filter((step) => step.done).length;

  if (onDashboard || steps.length === 0 || doneCount === steps.length)
    return null;

  return (
    <Can I="manage" a="CHATBOT">
      <section aria-labelledby="getting-started-nav" className="px-3 py-2">
        <div className="bg-ui-bg-base shadow-borders-base flex flex-col gap-y-2 rounded-lg px-2 py-3">
          <Text
            id="getting-started-nav"
            className="px-1"
            size="small"
            weight="plus"
            leading="compact"
          >
            {t("dashboard.gettingStarted.title")}
          </Text>
          <div className="flex items-center gap-x-2 px-1">
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
          <ol className="flex flex-col">
            {steps.map((step) => {
              const title = t(
                `dashboard.gettingStarted.steps.${step.key}.title`,
              );
              return (
                <li key={step.key}>
                  {step.done ? (
                    <span className="text-ui-fg-muted flex items-center gap-x-2 px-1 py-1">
                      <CheckCircleSolid className="text-ui-tag-green-icon shrink-0" />
                      <Text
                        size="xsmall"
                        leading="compact"
                        className="line-through"
                      >
                        {title}
                      </Text>
                    </span>
                  ) : (
                    <Link
                      to={step.to}
                      className="text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-base-hover flex items-center gap-x-2 rounded-md px-1 py-1 transition-colors"
                    >
                      <CircleMiniSolid className="text-ui-fg-muted shrink-0" />
                      <Text size="xsmall" leading="compact" weight="plus">
                        {title}
                      </Text>
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </Can>
  );
};
