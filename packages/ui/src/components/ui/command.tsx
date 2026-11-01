// Adapted from shadcn/ui's "command" registry item (new-york-v4 style,
// https://ui.shadcn.com/r/styles/new-york-v4/command.json, fetched 2026-09-21)
// for cmdk@1 — swapped `cn` for @medusajs/ui's `clx`, swapped shadcn's own
// `Dialog` wrapper for a Radix Dialog (named CommandPrompt; unlike medusa's
// alert-dialog `Prompt` it closes on an outside click), and kept this repo's medusa design-token classes
// in place of upstream's shadcn/Tailwind ones.
import { clx } from "@medusajs/ui";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

const DEFAULT_PROMPT_TITLE = "Command Palette";
const DEFAULT_PROMPT_DESCRIPTION = "Search for a command to run...";

function Command({
  className,
  ...commandProps
}: React.ComponentProps<typeof CommandPrimitive>) {
  const classes = clx(
    "bg-popover text-popover-foreground flex size-full flex-col overflow-hidden rounded-md",
    className,
  );

  return (
    <CommandPrimitive
      data-slot="command"
      className={classes}
      {...commandProps}
    />
  );
}

function CommandPrompt({
  title = DEFAULT_PROMPT_TITLE,
  description = DEFAULT_PROMPT_DESCRIPTION,
  commandProps,
  children,
  ...dialogProps
}: {
  title?: string;
  description?: string;
  /** Props for the inner `Command`, e.g. `shouldFilter={false}` for server search. */
  commandProps?: React.ComponentProps<typeof Command>;
} & React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <DialogPrimitive.Root {...dialogProps}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-ui-bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50" />
        <DialogPrimitive.Content
          className={clx(
            "bg-ui-bg-base shadow-elevation-modal fixed left-1/2 top-[15svh] z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-150",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
          <Command {...commandProps}>{children}</Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CommandInput({
  className,
  icon,
  ...inputProps
}: {
  icon?: React.ReactNode;
} & React.ComponentProps<typeof CommandPrimitive.Input>) {
  const wrapperClasses =
    "border-input flex items-center gap-x-2 border-b px-5 [&>svg]:text-ui-fg-muted/70";
  const classes = clx(
    "placeholder:text-ui-fg-muted/70 flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50 focus:ring-0 focus-visible:outline-none",
    className,
  );

  return (
    <div
      className={wrapperClasses}
      // eslint-disable-next-line react/no-unknown-property
      cmdk-input-wrapper=""
    >
      {icon}
      <CommandPrimitive.Input
        data-slot="command-input-wrapper"
        className={classes}
        {...inputProps}
      />
    </div>
  );
}

function CommandList({
  className,
  ...listProps
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  const classes = clx(
    "max-h-80 flex-1 overflow-x-hidden overflow-y-auto",
    className,
  );

  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={classes}
      {...listProps}
    />
  );
}

function CommandEmpty({
  ...emptyProps
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  const classes = "py-6 text-center text-sm text-ui-fg-muted";

  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={classes}
      {...emptyProps}
    />
  );
}

function CommandGroup({
  className,
  ...groupProps
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  const classes = clx(
    "text-ui-fg-base [&_[cmdk-group-heading]]:text-ui-fg-muted overflow-hidden p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
    className,
  );

  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={classes}
      {...groupProps}
    />
  );
}

function CommandSeparator({
  className,
  ...separatorProps
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  const classes = clx("bg-ui-bg-field -mx-1 h-px", className);

  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={classes}
      {...separatorProps}
    />
  );
}

function CommandItem({
  className,
  ...itemProps
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  const classes = clx(
    "data-[selected=true]:bg-ui-bg-component txt-compact-small cursor-pointer rounded-[4px] px-2 py-1.5 outline-none transition-colors",
    "focus-visible:bg-ui-bg-component-hover",
    "active:bg-ui-bg-component-pressed",
    "data-[selected=true]:txt-compact-small-plus",
    "disabled:text-ui-fg-disabled",
    className,
  );

  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={classes}
      {...itemProps}
    />
  );
}

function CommandShortcut({
  className,
  ...shortcutProps
}: React.ComponentProps<"span">) {
  const classes = clx(
    "bg-ui-tag-neutral-bg text-ui-tag-neutral-text border-ui-tag-neutral-border inline-flex h-5 w-fit min-w-[20px] items-center justify-center rounded-md border px-1 txt-compact-xsmall-plus",
    className,
  );

  return (
    <kbd data-slot="command-shortcut" className={classes} {...shortcutProps} />
  );
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPrompt,
  CommandSeparator,
  CommandShortcut,
};
