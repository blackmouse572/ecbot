import { CheckCircleSolid } from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useGettingStartedSteps } from "@/components/getting-started";

/** Checklist that walks a new workspace to its first customer conversation. */
export const GettingStarted: FC = () => {
  const { t } = useTranslation();
  const steps = useGettingStartedSteps();

  if (steps.length === 0 || steps.every((step) => step.done)) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("dashboard.gettingStarted.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("dashboard.gettingStarted.description")}
        </Text>
      </div>
      <ol className="divide-y">
        {steps.map((step) => {
          const title = t(`dashboard.gettingStarted.steps.${step.key}.title`);
          const content = (
            <>
              {step.done ? (
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <CheckCircleSolid className="text-ui-tag-green-icon" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="bg-ui-bg-component text-ui-fg-subtle shadow-borders-base flex shrink-0 items-center justify-center rounded-md size-8"
                >
                  <step.icon />
                </span>
              )}
              <div className="min-w-0">
                <Text
                  weight="plus"
                  className={
                    step.done
                      ? "text-ui-fg-muted line-through"
                      : "text-ui-fg-base"
                  }
                >
                  {title}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {t(`dashboard.gettingStarted.steps.${step.key}.description`)}
                </Text>
              </div>
            </>
          );
          return (
            <li key={step.key}>
              {step.done ? (
                <div className="flex items-start gap-x-3 px-6 py-4">
                  {content}
                </div>
              ) : (
                <Link
                  to={step.to}
                  className="hover:bg-ui-bg-base-hover flex items-start gap-x-3 px-6 py-4 transition-colors"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Container>
  );
};
