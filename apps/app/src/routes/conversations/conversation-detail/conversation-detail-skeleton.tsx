import { Skeleton } from "@repo/ui/common-components";
import { useAtomValue } from "jotai";
import { conversationSidebarOpenAtom } from "../state";

// Same frame as the loaded thread (header, messages, composer, customer
// panel) so the pane keeps its shape while the conversation or its route
// chunk loads.
export const ConversationDetailSkeleton = () => {
  // Same persisted choice as the real panel: a collapsed rail or the open split.
  const sidebarOpen = useAtomValue(conversationSidebarOpenAtom);
  return (
    <div aria-hidden className="flex h-full flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-ui-border-base flex items-center gap-x-3 border-b px-3 py-3 sm:px-4">
          <Skeleton className="h-7 w-7 rounded-md" />
          <div className="flex flex-col gap-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-y-3 p-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-8 w-2/3 self-end" />
          <Skeleton className="h-8 w-2/5" />
        </div>
        <div className="border-ui-border-base border-t p-3">
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      </div>
      {sidebarOpen ? (
        <div
          data-testid="customer-panel-skeleton"
          className="border-ui-border-base hidden w-[28%] shrink-0 flex-col gap-y-3 border-l p-4 md:flex"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div
          data-testid="customer-rail-skeleton"
          className="border-ui-border-base hidden w-10 shrink-0 border-l md:block"
        />
      )}
    </div>
  );
};
