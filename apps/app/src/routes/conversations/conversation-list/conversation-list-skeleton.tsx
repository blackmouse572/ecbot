import { Skeleton } from "@repo/ui/common-components";

export const ConversationListSkeleton = () => (
  <div className="flex flex-col">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="border-ui-border-base flex items-start gap-x-3 border-b px-4 py-3"
      >
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex flex-1 flex-col gap-y-2">
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    ))}
  </div>
);
