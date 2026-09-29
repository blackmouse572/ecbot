import { ExclamationCircle, MagnifyingGlass, PlusMini } from "@medusajs/icons";
import { Button, Text, clx } from "@medusajs/ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export type NoResultsProps = {
  title?: string;
  message?: string;
  className?: string;
};

export const NoResults = ({ title, message, className }: NoResultsProps) => {
  const { t } = useTranslation();
  // The `[data-slot='no-result']` selector is what data-table.tsx keys its
  // empty-state min-height off of — the attribute value must stay literal.
  const rootClassName = clx(
    "flex w-full items-center justify-center",
    className,
  );

  return (
    <div data-slot="no-result" className={rootClassName}>
      <div className="flex flex-col items-center gap-y-2">
        <MagnifyingGlass />
        <Text size="small" leading="compact" weight="plus">
          {title ?? t("general.noResultsTitle")}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {message ?? t("general.noResultsMessage")}
        </Text>
      </div>
    </div>
  );
};

type ActionProps = {
  action?: {
    to: string;
    label: string;
  };
};

export type NoRecordsProps = {
  title?: string;
  message?: string;
  className?: string;
  buttonVariant?: string;
  icon?: React.ReactNode;
} & ActionProps;

// Router links: `to` resolves like any route link (relative paths work) and
// navigating keeps the SPA instead of reloading the page.
const DefaultButton = ({ action }: ActionProps) =>
  action && (
    <Button variant="secondary" size="small" asChild>
      <Link to={action.to}>{action.label}</Link>
    </Button>
  );

const TransparentIconLeftButton = ({ action }: ActionProps) =>
  action && (
    <Button variant="transparent" className="text-ui-fg-interactive" asChild>
      <Link to={action.to}>
        <PlusMini /> {action.label}
      </Link>
    </Button>
  );

export const NoRecords = ({
  title,
  message,
  action,
  className,
  buttonVariant = "default",
  icon = <ExclamationCircle className="text-ui-fg-subtle" />,
}: NoRecordsProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={clx(
        "flex h-[150px] w-full flex-col items-center justify-center gap-y-4",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-y-3">
        {icon}

        <div className="flex flex-col items-center gap-y-1">
          <Text size="small" leading="compact" weight="plus">
            {title ?? t("general.noRecordsTitle")}
          </Text>

          <Text size="small" className="text-ui-fg-muted">
            {message ?? t("general.noRecordsMessage")}
          </Text>
        </div>
      </div>

      {buttonVariant === "default" && <DefaultButton action={action} />}
      {buttonVariant === "transparentIconLeft" && (
        <TransparentIconLeftButton action={action} />
      )}
    </div>
  );
};
