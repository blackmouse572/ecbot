import { XMark } from "@medusajs/icons";
import { IconButton, clx } from "@medusajs/ui";
import { Dialog as RadixDialog } from "radix-ui";
import { type PropsWithChildren } from "react";
import { useSidebar } from "../sidebar";

export type MobileNavLabels = { title: string; description: string };

export const MobileSidebarContainer = ({
  children,
  mobileNavLabels,
}: PropsWithChildren<{ mobileNavLabels: MobileNavLabels }>) => {
  const { mobile, toggle } = useSidebar();

  return (
    <RadixDialog.Root open={mobile} onOpenChange={() => toggle("mobile")}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={clx(
            "bg-ui-bg-overlay fixed inset-0",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <RadixDialog.Content
          className={clx(
            "bg-ui-bg-subtle shadow-elevation-modal fixed inset-y-2 left-2 flex w-full max-w-[304px] flex-col overflow-hidden rounded-lg border-r",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 duration-200",
          )}
        >
          <div className="p-3">
            <RadixDialog.Close asChild>
              <IconButton
                size="small"
                variant="transparent"
                className="text-ui-fg-subtle"
              >
                <XMark />
              </IconButton>
            </RadixDialog.Close>
            <RadixDialog.Title className="sr-only">
              {mobileNavLabels.title}
            </RadixDialog.Title>
            <RadixDialog.Description className="sr-only">
              {mobileNavLabels.description}
            </RadixDialog.Description>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
