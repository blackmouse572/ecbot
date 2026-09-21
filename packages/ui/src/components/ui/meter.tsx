"use client";

import { clx } from "@medusajs/ui";
import { Meter as MeterPrimitive } from "@base-ui/react/meter";

// A meter is not a progress bar: it shows how full a bounded, static quantity
// is right now (disk used, quota consumed), not how far a task has advanced.
// Base UI gives us the `role="meter"` + aria-valuenow wiring; everything here
// is styling and the tone ramp.

type Tone = "normal" | "warning" | "danger";

const INDICATOR_TONE: Record<Tone, string> = {
  normal: "bg-ui-tag-green-icon",
  warning: "bg-ui-tag-orange-icon",
  danger: "bg-ui-tag-red-icon",
};

type RootProps = MeterPrimitive.Root.Props;

function Root({ className, ...props }: RootProps) {
  return (
    <MeterPrimitive.Root
      className={clx("flex w-full flex-col gap-y-2", className)}
      {...props}
    />
  );
}

function Label({ className, ...props }: MeterPrimitive.Label.Props) {
  return (
    <MeterPrimitive.Label
      className={clx("txt-compact-small-plus text-ui-fg-base", className)}
      {...props}
    />
  );
}

function Value({ className, ...props }: MeterPrimitive.Value.Props) {
  return (
    <MeterPrimitive.Value
      className={clx(
        "txt-compact-small text-ui-fg-subtle tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

function Track({ className, ...props }: MeterPrimitive.Track.Props) {
  return (
    <MeterPrimitive.Track
      className={clx(
        "bg-ui-bg-component h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

type IndicatorProps = MeterPrimitive.Indicator.Props & {
  /** Colour ramp — callers decide the thresholds, this only paints. */
  tone?: Tone;
};

function Indicator({ className, tone = "normal", ...props }: IndicatorProps) {
  return (
    <MeterPrimitive.Indicator
      className={clx(
        "h-full rounded-full transition-[width] duration-300 ease-out",
        INDICATOR_TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

export const Meter = Object.assign(Root, {
  Label,
  Value,
  Track,
  Indicator,
});
