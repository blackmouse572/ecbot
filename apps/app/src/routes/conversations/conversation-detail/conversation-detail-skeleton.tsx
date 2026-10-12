import { Skeleton } from "@repo/ui/common-components";

// Same frame as the loaded thread (header, messages, composer) so the pane
// keeps its shape while the conversation or its route chunk loads.
export const ConversationDetailSkeleton = () => (
  <div aria-hidden className="flex h-full flex-1 flex-col">
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
);
