"use client";

import { clx } from "@medusajs/ui";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

// Base UI owns the hard parts — pointer/keyboard interaction, ARIA wiring and
// the percentage maths behind Indicator/Thumb positioning. Everything here is
// styling against the Medusa tokens.

function Root({ className, ...props }: SliderPrimitive.Root.Props) {
  return (
    <SliderPrimitive.Root
      className={clx("flex w-full flex-col gap-y-2", className)}
      {...props}
    />
  );
}

function Label({ className, ...props }: SliderPrimitive.Label.Props) {
  return (
    <SliderPrimitive.Label
      className={clx("txt-compact-small-plus text-ui-fg-base", className)}
      {...props}
    />
  );
}

function Value({ className, ...props }: SliderPrimitive.Value.Props) {
  return (
    <SliderPrimitive.Value
      className={clx(
        "txt-compact-small text-ui-fg-subtle tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

function Control({ className, ...props }: SliderPrimitive.Control.Props) {
  return (
    <SliderPrimitive.Control
      // Padding, not height: the thumb needs room to overflow the 2px track
      // without the pointer target shrinking to the track itself.
      className={clx("flex w-full touch-none items-center py-2", className)}
      {...props}
    />
  );
}

function Track({ className, ...props }: SliderPrimitive.Track.Props) {
  return (
    <SliderPrimitive.Track
      className={clx(
        "bg-ui-bg-component h-1.5 w-full rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function Indicator({ className, ...props }: SliderPrimitive.Indicator.Props) {
  return (
    <SliderPrimitive.Indicator
      className={clx("bg-ui-fg-base rounded-full", className)}
      {...props}
    />
  );
}

function Thumb({ className, ...props }: SliderPrimitive.Thumb.Props) {
  return (
    <SliderPrimitive.Thumb
      className={clx(
        "bg-ui-bg-base shadow-borders-base size-4 rounded-full outline-none",
        "focus-visible:shadow-borders-interactive-with-focus",
        className,
      )}
      {...props}
    />
  );
}

export const Slider = Object.assign(Root, {
  Label,
  Value,
  Control,
  Track,
  Indicator,
  Thumb,
});
