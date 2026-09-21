"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { MinusMini } from "@medusajs/icons";
import { IconButton, Text } from "@medusajs/ui";
import { type ReactNode } from "react";

export interface SidebarCollapsibleSectionProps {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Collapsible section used in sidebars (settings, workspace settings). Renders
 * a muted label row with a collapse toggle, followed by the children in a panel.
 *
 * This component is based on the [Base UI Collapsible](https://base-ui.com/react/components/collapsible) primitive.
 */
export const SidebarCollapsibleSection = ({
  label,
  children,
  defaultOpen = true,
}: SidebarCollapsibleSectionProps) => {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} className="py-3">
      <div className="px-3">
        <div className="text-ui-fg-muted flex h-7 items-center justify-between px-2">
          <Text size="small" leading="compact">
            {label}
          </Text>
          <Collapsible.Trigger
            render={
              <IconButton
                size="2xsmall"
                variant="transparent"
                className="static"
              >
                <MinusMini className="text-ui-fg-muted" />
              </IconButton>
            }
          />
        </div>
      </div>
      {/* Height is driven by Base UI's --collapsible-panel-height; a transition
          (not keyframes) keeps a fast re-toggle interruptible. */}
      <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
        <div className="pt-0.5">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
};
