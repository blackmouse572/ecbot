// Adapted from shadcn/ui's "command" registry item (new-york-v4 style,
// https://ui.shadcn.com/r/styles/new-york-v4/command.json, fetched 2026-09-21)
// for cmdk@1 — swapped `cn` for @medusajs/ui's `clx`, swapped shadcn's own
// `Dialog` wrapper for @medusajs/ui's `Prompt` (renamed CommandDialog ->
// CommandPrompt to match), and kept this repo's medusa design-token classes
// in place of upstream's shadcn/Tailwind ones.
import { clx, Prompt } from "@medusajs/ui";
import { Command as CommandPrimitive } from "cmdk";
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
  children,
  ...promptProps
}: {
  title?: string;
  description?: string;
} & React.ComponentProps<typeof Prompt>) {
  return (
    <Prompt {...promptProps}>
      <Prompt.Header className="sr-only">
        <Prompt.Title>{title}</Prompt.Title>
        <Prompt.Description>{description}</Prompt.Description>
      </Prompt.Header>
      <Prompt.Content className="overflow-hidden p-0 sm:max-w-lg [&>button:last-child]:hidden">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground max-h-[100svh] **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2">
          {children}
        </Command>
      </Prompt.Content>
    </Prompt>
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
    "border-input flex items-center border-b px-5 [&>svg]:text-ui-fg-muted/70";
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
