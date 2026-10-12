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
  /**
   * The next step for the user. `to` renders a router link (relative paths
   * work and navigating keeps the SPA); `onClick` renders a button for
   * actions that open a dialog or drawer in place.
   */
  action?:
    | { label: string; to: string; onClick?: never }
    | { label: string; onClick: () => void; to?: never };
};

export type NoRecordsProps = {
  title?: string;
  message?: string;
  className?: string;
  buttonVariant?: string;
  icon?: React.ReactNode;
  /** `small` fits side panels and nested sections: tighter, no min height. */
  size?: "base" | "small";
} & ActionProps;

const ActionButton = ({
  action,
  variant,
}: Required<ActionProps> & { variant: string }) => {
  const isTransparent = variant === "transparentIconLeft";
  const content = isTransparent ? (
    <>
      <PlusMini /> {action.label}
    </>
  ) : (
    action.label
  );
  const buttonProps = isTransparent
    ? ({
        variant: "transparent",
        className: "text-ui-fg-interactive",
      } as const)
    : ({ variant: "secondary", size: "small" } as const);

  if (action.to) {
    return (
      <Button {...buttonProps} asChild>
        <Link to={action.to}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button {...buttonProps} type="button" onClick={action.onClick}>
      {content}
    </Button>
  );
};

export const NoRecords = ({
  title,
  message,
  action,
  className,
  buttonVariant = "default",
  icon = <ExclamationCircle />,
  size = "base",
}: NoRecordsProps) => {
  const isSmall = size === "small";
  const { t } = useTranslation();

  return (
    <div
      className={clx(
        "flex w-full flex-col items-center justify-center",
        isSmall ? "gap-y-3 px-3 py-4" : "min-h-[240px] gap-y-4 px-6 py-10",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-y-3">
        <div
          aria-hidden
          className={clx(
            "bg-ui-bg-component shadow-borders-base text-ui-fg-subtle flex items-center justify-center rounded-lg",
            isSmall ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5",
          )}
        >
          {icon}
        </div>

        <div className="flex max-w-sm flex-col items-center gap-y-1 text-center">
          <Text size="small" leading="compact" weight="plus">
            {title ?? t("general.noRecordsTitle")}
          </Text>

          <Text size="small" className="text-ui-fg-subtle">
            {message ?? t("general.noRecordsMessage")}
          </Text>
        </div>
      </div>

      {action && <ActionButton action={action} variant={buttonVariant} />}
    </div>
  );
};
