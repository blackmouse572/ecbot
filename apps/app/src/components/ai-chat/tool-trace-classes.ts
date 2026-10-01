// Shared classes for the tool trace rows.

// A step drops 6px into place out of a slight blur, 60ms after the row above,
// so a run of calls cascades. Each step draws the connector line from its top
// edge down through its icon; the last one stops at its icon's centre.
export const TOOL_TRACE_STEP = [
  "relative",
  "before:absolute before:top-0 before:bottom-0 before:left-[9.5px] before:w-px before:bg-ui-border-base",
  "last:before:bottom-auto last:before:h-[14px]",
  "transition-[opacity,transform,filter] delay-60 duration-270 ease-out",
  "starting:-translate-y-1.5 starting:opacity-0 starting:blur-[2px]",
  "motion-reduce:starting:translate-y-0 motion-reduce:starting:blur-none",
].join(" ");

export const TOOL_TRACE_ROW =
  "txt-compact-small text-ui-fg-subtle flex w-full items-center gap-2.5 py-1 text-left";
