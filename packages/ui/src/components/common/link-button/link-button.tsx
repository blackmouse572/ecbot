import { clx } from "@medusajs/ui";
import { type ComponentPropsWithoutRef } from "react";
import { Slot } from "radix-ui";

interface LinkButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "interactive";
  asChild?: boolean;
}

export const LinkButton = ({
  className,
  variant = "interactive",
  ...props
}: LinkButtonProps) => {
  const Component = props.asChild ? Slot.Root : "button";
  return (
    <Component
      className={clx(
        "transition-fg txt-compact-small-plus rounded-[4px] outline-none",
        "focus-visible:shadow-borders-focus",
        {
          "text-ui-fg-interactive hover:text-ui-fg-interactive-hover":
            variant === "interactive",
          "text-ui-fg-base hover:text-ui-fg-subtle": variant === "primary",
        },
        className,
      )}
      {...props}
    />
  );
};
