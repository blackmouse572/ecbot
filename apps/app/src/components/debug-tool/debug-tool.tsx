import { clx, IconButton } from "@medusajs/ui";
import { MinusMini, PlusMini } from "@medusajs/icons";
import React from "react";
import { DebugTokenExtension } from "./extensions/debug-token-extension";
import { DebugThemeExtension } from "./extensions/debug-theme-extension";

type DebugToolProps = React.ComponentProps<"div"> & {
  side?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  defaultMinimized?: boolean;
};

export function DebugTool({
  className,
  side = "bottom-left",
  defaultMinimized = false,
  ...props
}: DebugToolProps) {
  const [isMinimized, setIsMinimized] = React.useState(defaultMinimized);
  if (isMinimized) {
    return (
      <IconButton
        className={clx("fixed rounded-full aspect-square z-[10000]", {
          "top-4 left-4": side === "top-left",
          "top-4 right-4": side === "top-right",
          "bottom-4 left-4": side === "bottom-left",
          "bottom-4 right-4": side === "bottom-right",
        })}
      >
        <PlusMini onClick={() => setIsMinimized(false)} />
      </IconButton>
    );
  }

  return (
    <div
      className={clx(
        "bg-ui-bg-base shadow-elevation-flyout fixed flex w-full max-w-[300px] flex-col rounded-lg border focus-visible:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200 transition-all ease-in-out z-[1]",
        {
          "top-4 left-4": side === "top-left",
          "top-4 right-4": side === "top-right",
          "bottom-4 left-4": side === "bottom-left",
          "bottom-4 right-4": side === "bottom-right",
        },
        isMinimized &&
          "max-w-[32px] min-h-[32px] overflow-hidden flex items-center justify-center",
        className,
      )}
      {...props}
    >
      <div className="p-4 space-y-4 relative">
        <IconButton
          size="xsmall"
          onClick={() => setIsMinimized(true)}
          variant="transparent"
          className="absolute top-2 right-2"
        >
          <MinusMini />
        </IconButton>
        <h1 className="font-medium txt-compact-medium-plus">Debug tool</h1>
        <div className="space-y-2">
          <DebugTokenExtension />
          <DebugThemeExtension />
        </div>
      </div>
    </div>
  );
}
