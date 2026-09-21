import { DotsSix } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import * as ResizablePrimitive from "react-resizable-panels";

/**
 * Resizable panel layout, based on
 * [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
 * (the primitive behind shadcn's Resizable). Pass an `autoSaveId` on the group
 * to persist panel sizes to localStorage.
 */
const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={clx(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className,
    )}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={clx(
      "bg-ui-border-base focus-visible:ring-ui-fg-interactive relative flex w-px items-center justify-center outline-none transition-colors focus-visible:ring-2",
      "hover:bg-ui-border-interactive data-[resize-handle-state=drag]:bg-ui-border-interactive",
      "after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",
      "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
      "data-[panel-group-direction=vertical]:after:inset-x-0 data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-2 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="bg-ui-bg-base border-ui-border-base text-ui-fg-muted z-10 flex h-5 w-3 items-center justify-center rounded-sm border">
        <DotsSix className="rotate-90" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
