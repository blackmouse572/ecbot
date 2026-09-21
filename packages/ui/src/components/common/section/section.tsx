import { clx } from "@medusajs/ui";
import React from "react";

export function Section({
  children,
  className,
  variant = "default",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  variant?: "default" | "spaced";
}) {
  return (
    <div
      className={clx(
        {
          "[&>div>*:nth-child(2)]:justify-self-end [&>div>*:nth-child(2)]:text-right":
            variant === "spaced",
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
