"use client";

import { ChevronDownMini } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

type RootProps = NavigationMenuPrimitive.Root.Props & {
  /**
   * Props forwarded to the auto-mounted Positioner (offset, side, align...).
   */
  positionerProps?: NavigationMenuPrimitive.Positioner.Props;
};

/**
 * Root container for the entire navigation menu.
 * Auto-mounts Portal + Positioner + Popup + Viewport so consumers only need
 * to render `<NavigationMenu.List>` (and items) as children.
 */
function Root({ children, positionerProps, ...props }: RootProps) {
  return (
    <NavigationMenuPrimitive.Root {...props}>
      {children}
      <Portal>
        <Positioner {...positionerProps}>
          <Popup>
            <Viewport />
          </Popup>
        </Positioner>
      </Portal>
    </NavigationMenuPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/**
 * Renders as `<ul>`. Holds all NavigationMenu.Item elements.
 */
function List({ className, ...props }: NavigationMenuPrimitive.List.Props) {
  return (
    <NavigationMenuPrimitive.List
      className={clx("flex list-none items-center gap-1 p-0 m-0", className)}
      {...props}
    />
  );
}
List.displayName = "NavigationMenu.List";

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

/**
 * Renders as `<li>`. Wraps a Trigger+Content pair or a standalone Link.
 */
const Item = NavigationMenuPrimitive.Item;
Item.displayName = "NavigationMenu.Item";

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/**
 * Opens the popup on hover/focus. Renders a `<button>` by default.
 * Includes a rotating chevron icon to indicate open state.
 */
function Trigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      className={clx(
        "txt-compact-small text-ui-fg-base bg-ui-bg-component font-medium",
        "flex select-none items-center gap-1 rounded-md px-3 py-1.5",
        "outline-none transition-colors",
        "hover:bg-ui-bg-component-hover focus-visible:bg-ui-bg-component-hover",
        "data-popup-open:bg-ui-bg-component-hover",
        "data-disabled:pointer-events-none data-disabled:text-ui-fg-disabled",
        className,
      )}
      {...props}
    >
      {children}
      <NavigationMenuPrimitive.Icon
        className={clx(
          "text-ui-fg-muted data-popup-open:text-ui-fg-base size-3",
          "transition-all duration-200",
          "data-popup-open:rotate-180",
        )}
        render={<ChevronDownMini />}
      />
    </NavigationMenuPrimitive.Trigger>
  );
}
Trigger.displayName = "NavigationMenu.Trigger";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/**
 * The content shown inside the Viewport when this item's Trigger is active.
 */
function Content({
  className,
  ...props
}: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      className={clx(
        "w-max",
        "data-[activation-direction=right]:animate-in data-[activation-direction=right]:slide-in-from-left-4",
        "data-[activation-direction=left]:animate-in data-[activation-direction=left]:slide-in-from-right-4",
        className,
      )}
      {...props}
    />
  );
}
Content.displayName = "NavigationMenu.Content";

// ---------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------

/**
 * A navigation link. Use inside Content or directly inside Item for top-level links.
 * Set `active` when the link matches the current route.
 */
function Link({
  className,
  active,
  ...props
}: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      active={active}
      className={clx(
        "txt-compact-small text-ui-fg-base font-medium",
        "flex select-none items-center gap-1.5 rounded-md px-3 py-1.5",
        "outline-none transition-colors",
        "hover:bg-ui-bg-component-hover focus-visible:bg-ui-bg-component-hover",
        "data-active:text-ui-fg-interactive data-active:txt-compact-small-plus",
        className,
      )}
      {...props}
    />
  );
}
Link.displayName = "NavigationMenu.Link";

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

const Portal = NavigationMenuPrimitive.Portal;
Portal.displayName = "NavigationMenu.Portal";

// ---------------------------------------------------------------------------
// Positioner
// ---------------------------------------------------------------------------

/**
 * Positions the Popup relative to the active Trigger.
 */
function Positioner({
  className,
  sideOffset = 8,
  align = "start",
  side = "bottom",
  ...props
}: NavigationMenuPrimitive.Positioner.Props) {
  return (
    <NavigationMenuPrimitive.Positioner
      collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
      collisionAvoidance={{ side: "none" }}
      side={side}
      sideOffset={sideOffset}
      align={align}
      className={clx(
        "isolate z-50",
        (className =
          "h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom] duration-[var(--duration)] ease-[var(--easing)] before:absolute before:content-[''] data-instant:transition-none data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0 data-[side=bottom]:before:h-2.5 data-[side=left]:before:top-0 data-[side=left]:before:right-[-10px] data-[side=left]:before:bottom-0 data-[side=left]:before:w-2.5 data-[side=right]:before:top-0 data-[side=right]:before:bottom-0 data-[side=right]:before:left-[-10px] data-[side=right]:before:w-2.5 data-[side=top]:before:right-0 data-[side=top]:before:bottom-[-10px] data-[side=top]:before:left-0 data-[side=top]:before:h-2.5"),
        className,
      )}
      style={{
        ["--duration" as string]: "0.35s",
        ["--easing" as string]: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      {...props}
    />
  );
}
Positioner.displayName = "NavigationMenu.Positioner";

// ---------------------------------------------------------------------------
// Popup
// ---------------------------------------------------------------------------

/**
 * Outer popup container. Wraps the Viewport and handles enter/exit animations.
 */
function Popup({ className, ...props }: NavigationMenuPrimitive.Popup.Props) {
  return (
    <NavigationMenuPrimitive.Popup
      className={clx(
        "bg-ui-bg-component text-ui-fg-base shadow-elevation-flyout",
        "overflow-hidden rounded-lg",
        "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-98",
        "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-98",
        "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
        className,
      )}
      {...props}
    />
  );
}
Popup.displayName = "NavigationMenu.Popup";

// ---------------------------------------------------------------------------
// Viewport
// ---------------------------------------------------------------------------

/**
 * Clipping viewport inside the Popup. Enables smooth cross-item transitions.
 */
function Viewport({
  className,
  ...props
}: NavigationMenuPrimitive.Viewport.Props) {
  return (
    <NavigationMenuPrimitive.Viewport
      className={clx(
        "relative size-full",
        "overflow-hidden transition-[width,height] duration-200 ease-in-out",
        className,
      )}
      {...props}
    />
  );
}
Viewport.displayName = "NavigationMenu.Viewport";

// ---------------------------------------------------------------------------
// Arrow
// ---------------------------------------------------------------------------

/**
 * Optional arrow element pointing toward the active trigger.
 */
function Arrow({ className, ...props }: NavigationMenuPrimitive.Arrow.Props) {
  return (
    <NavigationMenuPrimitive.Arrow
      className={clx(
        "fill-ui-bg-component top-[-5px] h-[10px] w-[14px]",
        "drop-shadow-[0_-1px_0_var(--color-ui-border-base)]",
        className,
      )}
      {...props}
    />
  );
}
Arrow.displayName = "NavigationMenu.Arrow";

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

/**
 * Optional backdrop shown behind the popup when it is open.
 */
function Backdrop({
  className,
  ...props
}: NavigationMenuPrimitive.Backdrop.Props) {
  return (
    <NavigationMenuPrimitive.Backdrop
      className={clx("fixed inset-0 z-40", className)}
      {...props}
    />
  );
}
Backdrop.displayName = "NavigationMenu.Backdrop";

// ---------------------------------------------------------------------------
// Composed export
// ---------------------------------------------------------------------------

const NavigationMenu = Object.assign(Root, {
  List,
  Item,
  Trigger,
  Content,
  Link,
  Portal,
  Positioner,
  Popup,
  Viewport,
  Arrow,
  Backdrop,
});

export { NavigationMenu };
