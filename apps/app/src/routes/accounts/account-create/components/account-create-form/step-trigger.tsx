import { ProgressTabs, clx } from "@medusajs/ui";
import type { ComponentProps } from "react";

/**
 * A step tab that fits a phone header: below `sm` only the current step
 * keeps its label, the others shrink to their status icon.
 */
export const StepTrigger = ({
  className,
  children,
  ...props
}: ComponentProps<typeof ProgressTabs.Trigger>) => (
  <ProgressTabs.Trigger
    {...props}
    className={clx(
      "min-w-0 max-sm:w-auto max-sm:flex-none max-sm:px-3 max-sm:data-[state=active]:flex-1",
      className,
    )}
  >
    <span className="truncate max-sm:group-data-[state=inactive]/trigger:hidden">
      {children}
    </span>
  </ProgressTabs.Trigger>
);
