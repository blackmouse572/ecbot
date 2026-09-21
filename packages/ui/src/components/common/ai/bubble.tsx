import { clx } from "@medusajs/ui";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, createContext, useContext } from "react";

// ============================================================================
// Chat bubble — a message surface that sizes to its content and picks its
// side/tail from `align`. Rebuilt on @medusajs/ui tokens (no Base UI / CVA).
// ============================================================================

export type BubbleAlign = "start" | "end";
export type BubbleVariant = "default" | "muted" | "outline" | "ghost";

type BubbleContextValue = { align: BubbleAlign; variant: BubbleVariant };

const BubbleContext = createContext<BubbleContextValue>({
  align: "start",
  variant: "default",
});

const useBubble = () => useContext(BubbleContext);

export type BubbleProps = HTMLAttributes<HTMLDivElement> & {
  align?: BubbleAlign;
  variant?: BubbleVariant;
};

export const Bubble = ({
  align = "start",
  variant = "default",
  className,
  ...props
}: BubbleProps) => (
  <BubbleContext.Provider value={{ align, variant }}>
    <div
      data-align={align}
      className={clx(
        "group/bubble flex w-full flex-col gap-1.5",
        align === "end" ? "items-end" : "items-start",
        className,
      )}
      {...props}
    />
  </BubbleContext.Provider>
);

// Non-`default` variants are align-agnostic; `default` is filled per side below.
const variantSurface: Record<Exclude<BubbleVariant, "default">, string> = {
  muted: "bg-ui-bg-subtle text-ui-fg-subtle border border-ui-border-base",
  outline: "border border-ui-border-base text-ui-fg-base",
  ghost: "",
};

export type BubbleContentProps = HTMLAttributes<HTMLDivElement> & {
  /** Render as a different element (e.g. a link/button) while keeping styles. */
  render?: ReactElement;
};

export const BubbleContent = ({
  render,
  className,
  children,
  ...props
}: BubbleContentProps) => {
  const { align, variant } = useBubble();

  const isGhost = variant === "ghost";

  const surface =
    variant === "default"
      ? align === "end"
        ? "bg-ui-bg-component text-ui-fg-base"
        : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
      : variantSurface[variant];

  const classes = clx(
    "min-w-0 overflow-hidden text-sm leading-relaxed",
    isGhost
      ? "w-full max-w-full"
      : clx(
          "w-fit max-w-[80%] rounded-xl px-4 py-2.5 shadow-elevation-card-rest",
          align === "end" ? "rounded-br-sm" : "rounded-bl-sm",
        ),
    surface,
    className,
  );

  if (render) {
    const el = render as ReactElement<Record<string, unknown>>;
    return cloneElement(
      el,
      {
        ...props,
        className: clx(classes, el.props.className as string | undefined),
      },
      children ?? (el.props.children as ReactNode),
    );
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export type BubbleGroupProps = HTMLAttributes<HTMLDivElement> & {
  align?: BubbleAlign;
};

/** Groups consecutive bubbles from the same sender with a tighter gap. */
export const BubbleGroup = ({
  align = "start",
  className,
  ...props
}: BubbleGroupProps) => (
  <div
    data-align={align}
    className={clx(
      "flex w-full flex-col gap-1",
      align === "end" ? "items-end" : "items-start",
      className,
    )}
    {...props}
  />
);
