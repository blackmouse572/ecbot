"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckMini, XMarkMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import * as React from "react";

// Base UI combobox primitives, from shadcn's `combobox` (reui c-combobox-14),
// restyled with the Medusa UI tokens the rest of this folder uses. Only the
// multi-select (chips) family is ported.

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
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
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
};
