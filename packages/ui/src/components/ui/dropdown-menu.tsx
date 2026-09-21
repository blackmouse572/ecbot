"use client";

import { CheckMini, ChevronRightMini, EllipseMiniSolid } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import * as React from "react";

/**
 * This component is based on the [Base UI Menu](https://base-ui.com/react/components/menu) primitive.
 */
const Root = MenuPrimitive.Root;

/**
 * This component is based on the [Base UI Menu Trigger](https://base-ui.com/react/components/menu#trigger) primitive.
 */
const Trigger = MenuPrimitive.Trigger;

/**
 * This component is based on the [Base UI Menu Group](https://base-ui.com/react/components/menu#group) primitive.
 */
const Group = MenuPrimitive.Group;
Group.displayName = "DropdownMenu.Group";

/**
 * This component is based on the [Base UI Menu SubmenuRoot](https://base-ui.com/react/components/menu#submenu) primitive.
 */
const SubMenu = MenuPrimitive.SubmenuRoot;

/**
 * This component is based on the [Base UI Menu RadioGroup](https://base-ui.com/react/components/menu#radiogroup) primitive.
 */
const RadioGroup = MenuPrimitive.RadioGroup;
RadioGroup.displayName = "DropdownMenu.RadioGroup";

/**
 * This component is based on the [Base UI Menu SubmenuTrigger](https://base-ui.com/react/components/menu#submenutrigger) primitive.
 */
function SubMenuTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={clx(
        "bg-ui-bg-component text-ui-fg-base txt-compact-small relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 outline-none transition-colors",
        "focus-visible:bg-ui-bg-component-hover focus:bg-ui-bg-component-hover",
        "active:bg-ui-bg-component-hover",
        "data-disabled:text-ui-fg-disabled data-disabled:pointer-events-none",
        "data-popup-open:bg-ui-bg-component-hover",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightMini className="text-ui-fg-muted ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}
SubMenuTrigger.displayName = "DropdownMenu.SubMenuTrigger";

type ContentProps = MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "side" | "sideOffset" | "align" | "alignOffset"
  >;

/**
 * This component is based on the [Base UI Menu Popup](https://base-ui.com/react/components/menu#popup) primitive.
 * Positioning props (side, sideOffset, align, alignOffset) are forwarded to the Positioner.
 */
function Content({
  className,
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  ...props
}: ContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          className={clx(
            "bg-ui-bg-component text-ui-fg-base shadow-elevation-flyout min-w-[220px] overflow-hidden rounded-lg p-1",
            "max-h-(--available-height) origin-(--transform-origin)",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}
Content.displayName = "DropdownMenu.Content";

/**
 * Sub-menu content — reuses Content with submenu-appropriate defaults.
 */
function SubMenuContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: ContentProps) {
  return (
    <Content
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={clx("w-auto min-w-[96px]", className)}
      {...props}
    />
  );
}
SubMenuContent.displayName = "DropdownMenu.SubMenuContent";

/**
 * This component is based on the [Base UI Menu Item](https://base-ui.com/react/components/menu#item) primitive.
 */
function Item({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={clx(
        "bg-ui-bg-component text-ui-fg-base txt-compact-small relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 outline-none transition-colors",
        "focus-visible:bg-ui-bg-component-hover focus:bg-ui-bg-component-hover",
        "active:bg-ui-bg-component-hover",
        "data-disabled:text-ui-fg-disabled data-disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}
Item.displayName = "DropdownMenu.Item";

/**
 * This component is based on the [Base UI Menu CheckboxItem](https://base-ui.com/react/components/menu#checkboxitem) primitive.
 */
function CheckboxItem({
  className,
  children,
  checked,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      className={clx(
        "bg-ui-bg-component text-ui-fg-base txt-compact-small relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-[31px] pr-2 outline-none transition-colors",
        "focus-visible:bg-ui-bg-component-hover focus:bg-ui-bg-component-hover",
        "active:bg-ui-bg-component-hover",
        "data-disabled:text-ui-fg-disabled data-disabled:pointer-events-none",
        "data-checked:txt-compact-small-plus",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex size-[15px] items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckMini />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}
CheckboxItem.displayName = "DropdownMenu.CheckboxItem";

/**
 * This component is based on the [Base UI Menu RadioItem](https://base-ui.com/react/components/menu#radioitem) primitive.
 */
function RadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      className={clx(
        "bg-ui-bg-component txt-compact-small relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-[31px] pr-2 outline-none transition-colors",
        "focus-visible:bg-ui-bg-component-hover focus:bg-ui-bg-component-hover",
        "active:bg-ui-bg-component-hover",
        "data-disabled:text-ui-fg-disabled data-disabled:pointer-events-none",
        "data-checked:txt-compact-small-plus",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-[15px] items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <EllipseMiniSolid className="text-ui-fg-base" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}
RadioItem.displayName = "DropdownMenu.RadioItem";

/**
 * This component is based on the [Base UI Menu GroupLabel](https://base-ui.com/react/components/menu#grouplabel) primitive.
 */
function Label({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      className={clx("text-ui-fg-subtle txt-compact-xsmall-plus", className)}
      {...props}
    />
  );
}
Label.displayName = "DropdownMenu.Label";

/**
 * This component is based on the [Base UI Menu Separator](https://base-ui.com/react/components/menu#separator) primitive.
 */
function Separator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      className={clx(
        "bg-ui-border-component border-t-ui-border-menu-top border-b-ui-border-menu-bot -mx-1 my-1 h-0.5 border-b border-t",
        className,
      )}
      {...props}
    />
  );
}
Separator.displayName = "DropdownMenu.Separator";

/**
 * This component is based on the `span` element and supports all of its props
 */
function Shortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clx(
        "text-ui-fg-subtle txt-compact-small ml-auto tracking-widest",
        className,
      )}
      {...props}
    />
  );
}
Shortcut.displayName = "DropdownMenu.Shortcut";

/**
 * This component is based on the `span` element and supports all of its props
 */
function Hint({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clx(
        "text-ui-fg-subtle txt-compact-small ml-auto tracking-widest",
        className,
      )}
      {...props}
    />
  );
}
Hint.displayName = "DropdownMenu.Hint";

const DropdownMenu = Object.assign(Root, {
  Trigger,
  Group,
  SubMenu,
  SubMenuContent,
  SubMenuTrigger,
  Content,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  Label,
  Separator,
  Shortcut,
  Hint,
});

export { DropdownMenu };
