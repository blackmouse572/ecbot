import { CheckCircleSolid } from "@medusajs/icons";
import { Text, clx } from "@medusajs/ui";
import { Can } from "@repo/auth";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useMatch } from "react-router-dom";
import { ROUTES } from "@/routes/constants";
import { useGettingStartedSteps } from "./use-getting-started-steps";

/**
 * The getting-started checklist in the sidebar, so a new owner sees the next
 * step from every page. Hidden on the dashboard, which shows the full card,
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
        <div className="bg-ui-bg-base shadow-borders-base flex flex-col gap-y-2 rounded-lg p-3">
          <div className="flex items-center justify-between gap-x-2">
            <Text
              id="getting-started-nav"
              size="small"
              weight="plus"
              leading="compact"
            >
              {t("dashboard.gettingStarted.title")}
            </Text>
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
          <div className="flex gap-x-1" aria-hidden>
            {steps.map((step) => (
              <span
                key={step.key}
                className={clx(
                  "h-1 flex-1 rounded-full transition-colors duration-300 ease-out",
                  step.done ? "bg-ui-fg-interactive" : "bg-ui-bg-component",
                )}
              />
            ))}
          </div>
          <ol className="flex flex-col gap-y-0.5">
            {steps.map((step) => {
              const title = t(
                `dashboard.gettingStarted.steps.${step.key}.title`,
              );
              return (
                <li key={step.key}>
                  {step.done ? (
                    <span className="text-ui-fg-muted flex items-center gap-x-2 py-1">
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
                      className="text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-base-hover -mx-1 flex items-center gap-x-2 rounded-md px-1 py-1 transition-colors"
                    >
                      <span className="size-[15px] shrink-0 rounded-full border border-ui-border-strong" />
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
