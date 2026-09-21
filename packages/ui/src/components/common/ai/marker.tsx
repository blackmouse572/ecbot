import { clx } from "@medusajs/ui";
import type { HTMLAttributes, ReactElement } from "react";
import { cloneElement } from "react";

// ============================================================================
// Marker — inline conversation elements: status notes ("Ran <tool> · 120ms"),
// system/guardrail notices (border), and centered turn/date separators.
// ============================================================================

export type MarkerVariant = "default" | "border" | "separator";

export type MarkerProps = HTMLAttributes<HTMLDivElement> & {
  variant?: MarkerVariant;
  render?: ReactElement;
};

const variantClasses: Record<MarkerVariant, string> = {
  default: "gap-1.5",
  border:
    "gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-1.5",
  separator: "gap-3 w-full",
};

export const Marker = ({
  variant = "default",
  render,
  className,
  children,
  ...props
}: MarkerProps) => {
  const classes = clx(
    "flex items-center text-ui-fg-muted text-xs",
    variant === "separator" && "justify-center",
    variantClasses[variant],
    className,
  );

  const content =
    variant === "separator" ? (
      <>
        <span className="h-px flex-1 bg-ui-border-base" aria-hidden />
        {children}
        <span className="h-px flex-1 bg-ui-border-base" aria-hidden />
      </>
    ) : (
      children
    );

  if (render) {
    const el = render as ReactElement<Record<string, unknown>>;
    return cloneElement(
      el,
      {
        ...props,
        className: clx(classes, el.props.className as string | undefined),
      },
      content,
    );
  }

  return (
    <div className={classes} {...props}>
      {content}
    </div>
  );
};

export type MarkerIconProps = HTMLAttributes<HTMLSpanElement>;

export const MarkerIcon = ({ className, ...props }: MarkerIconProps) => (
  <span
    aria-hidden
    className={clx("flex shrink-0 items-center [&>svg]:size-3.5", className)}
    {...props}
  />
);

export type MarkerContentProps = HTMLAttributes<HTMLSpanElement>;

export const MarkerContent = ({ className, ...props }: MarkerContentProps) => (
  <span className={clx("min-w-0 truncate", className)} {...props} />
);
