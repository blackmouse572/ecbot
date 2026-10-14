"use client";

import { clx } from "@medusajs/ui";
import { Popover } from "@base-ui/react/popover";
import type { FC, PropsWithChildren, ReactNode } from "react";

/** One popover shared by every sidebar link with a hint: moving between links
 * slides it to the next link instead of closing and reopening. */
const hintPopover = Popover.createHandle<ReactNode>();

/** Long enough that passing over the sidebar never opens a hint. */
const HINT_OPEN_DELAY_MS = 800;
const HINT_CLOSE_DELAY_MS = 100;

/** Wraps a sidebar link so resting on it shows `hint` in the shared popover. */
export const NavHintTrigger: FC<PropsWithChildren<{ hint?: ReactNode }>> = ({
  hint,
  children,
}) => {
  if (!hint) return children;

  return (
    <Popover.Trigger
      handle={hintPopover}
      payload={hint}
      openOnHover
      delay={HINT_OPEN_DELAY_MS}
      closeDelay={HINT_CLOSE_DELAY_MS}
      nativeButton={false}
      // A plain wrapper: the link inside is the interactive element, so the
      // button role and focus stop are dropped, and following the link closes
      // the hint.
      render={(props) => {
        const {
          role: _role,
          tabIndex: _tabIndex,
          onClick: _onClick,
          onKeyDown: _onKeyDown,
          onKeyUp: _onKeyUp,
          "aria-haspopup": _haspopup,
          "aria-expanded": _expanded,
          "aria-controls": _controls,
          ...rest
        } = props;
        return (
          <div
            {...rest}
            className="w-full"
            onClick={() => hintPopover.close()}
          />
        );
      }}
    >
      {children}
    </Popover.Trigger>
  );
};

/** Render once in the sidebar. Shows the hint of the link under the pointer. */
export const NavHintPopover: FC = () => (
  <Popover.Root handle={hintPopover}>
    {({ payload }) => (
      <Popover.Portal>
        <Popover.Positioner
          side="right"
          align="start"
          sideOffset={12}
          className="h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom,transform] duration-[250ms] ease-in-out data-[instant]:transition-none"
        >
          <Popover.Popup
            initialFocus={false}
            finalFocus={false}
            className={clx(
              "bg-ui-bg-base shadow-elevation-flyout relative h-[var(--popup-height,auto)] w-[var(--popup-width,auto)] origin-[var(--transform-origin)] rounded-lg outline-none",
              "transition-[width,height,opacity,scale] duration-[250ms] ease-out",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[instant]:transition-none",
            )}
          >
            <Popover.Arrow className="transition-[top] duration-[250ms] ease-in-out data-[side=right]:-left-[9px] data-[side=right]:-rotate-90">
              <svg
                width="12"
                height="6"
                viewBox="0 0 12 6"
                aria-hidden="true"
                className="fill-ui-bg-base"
              >
                <path d="M0 6 6 0l6 6z" />
              </svg>
            </Popover.Arrow>
            <Popover.Viewport
              className={clx(
                "relative h-full w-[300px] overflow-clip rounded-lg",
                "[&_[data-current]]:w-[300px] [&_[data-current]]:translate-x-0 [&_[data-current]]:opacity-100 [&_[data-current]]:transition-[translate,opacity]",
                "[&_[data-previous]]:w-[300px] [&_[data-previous]]:translate-x-0 [&_[data-previous]]:opacity-100 [&_[data-previous]]:transition-[translate,opacity]",
                "[&_[data-current]]:duration-[250ms,150ms] [&_[data-previous]]:duration-[250ms,150ms] [&_[data-current]]:ease-in-out [&_[data-previous]]:ease-in-out",
                // Panels slide vertically: the links are stacked in a column.
                "data-[activation-direction~='up']:[&_[data-current][data-starting-style]]:-translate-y-1/4 data-[activation-direction~='up']:[&_[data-current][data-starting-style]]:opacity-0",
                "data-[activation-direction~='down']:[&_[data-current][data-starting-style]]:translate-y-1/4 data-[activation-direction~='down']:[&_[data-current][data-starting-style]]:opacity-0",
                "data-[activation-direction~='up']:[&_[data-previous][data-ending-style]]:translate-y-1/4 data-[activation-direction~='up']:[&_[data-previous][data-ending-style]]:opacity-0",
                "data-[activation-direction~='down']:[&_[data-previous][data-ending-style]]:-translate-y-1/4 data-[activation-direction~='down']:[&_[data-previous][data-ending-style]]:opacity-0",
              )}
            >
              {payload}
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    )}
  </Popover.Root>
);
