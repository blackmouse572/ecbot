"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckMini, TrianglesMini, XMarkMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import * as React from "react";

// Base UI combobox primitives, from shadcn's `combobox` (reui c-combobox-14),
// restyled with the Medusa UI tokens the rest of this folder uses. Ports the
// multi-select (chips) family plus a single-select input with groups.

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

/** Single-select search field styled like a Medusa Select trigger. */
function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={clx(
        "bg-ui-bg-field shadow-borders-base txt-compact-small relative flex h-8 w-full items-center rounded-md transition-fg",
        "hover:bg-ui-bg-field-hover focus-within:shadow-borders-interactive-with-active",
        "has-aria-invalid:shadow-borders-error has-disabled:opacity-50",
        className,
      )}
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className="placeholder:text-ui-fg-muted h-full min-w-0 flex-1 bg-transparent pr-8 pl-2 outline-none"
        {...props}
      />
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        aria-label="Open"
        className="text-ui-fg-muted absolute right-0 flex h-full w-8 items-center justify-center"
      >
        <TrianglesMini />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={clx(
            "group/combobox-content bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={clx(
        "max-h-64 scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={clx(
        "txt-compact-small relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 outline-hidden select-none",
        "data-highlighted:bg-ui-bg-base-hover data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckMini />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={clx("not-first:mt-1", className)}
      {...props}
    />
  );
}

function ComboboxGroupLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-group-label"
      className={clx(
        "txt-compact-xsmall-plus text-ui-fg-muted px-2 py-1.5 uppercase",
        className,
      )}
      {...props}
    />
  );
}

const ComboboxCollection = ComboboxPrimitive.Collection;

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={clx(
        "txt-compact-small text-ui-fg-muted hidden w-full justify-center py-2 text-center group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={clx(
        "bg-ui-bg-field shadow-borders-base txt-compact-small flex min-h-8 flex-wrap items-center gap-1 rounded-md px-1.5 py-1 transition-fg",
        "hover:bg-ui-bg-field-hover focus-within:shadow-borders-interactive-with-active",
        "has-aria-invalid:shadow-borders-error",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={clx(
        "bg-ui-bg-component text-ui-fg-base txt-compact-xsmall-plus shadow-borders-base flex h-6 w-fit items-center gap-1 rounded-md px-1.5 whitespace-nowrap",
        "has-disabled:pointer-events-none has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0.5",
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          data-slot="combobox-chip-remove"
          aria-label="Remove"
          className="text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-component-hover flex size-4 items-center justify-center rounded-sm"
        >
          <XMarkMini className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={clx(
        "placeholder:text-ui-fg-muted min-w-16 flex-1 bg-transparent outline-none",
        className,
      )}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
};
