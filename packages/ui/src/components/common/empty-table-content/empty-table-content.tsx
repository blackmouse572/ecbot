import { ExclamationCircle, MagnifyingGlass, PlusMini } from "@medusajs/icons";
import { Button, Text, clx } from "@medusajs/ui";
import React from "react";
import { useTranslation } from "react-i18next";

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

type NoRecordsProps = {
  title?: string;
  message?: string;
  className?: string;
  buttonVariant?: string;
  icon?: React.ReactNode;
} & ActionProps;

const DefaultButton = ({ action }: ActionProps) =>
  action && (
    <a href={action.to}>
      <Button variant="secondary" size="small">
        {action.label}
      </Button>
    </a>
  );

const TransparentIconLeftButton = ({ action }: ActionProps) =>
  action && (
    <a href={action.to}>
      <Button variant="transparent" className="text-ui-fg-interactive">
        <PlusMini /> {action.label}
      </Button>
    </a>
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
