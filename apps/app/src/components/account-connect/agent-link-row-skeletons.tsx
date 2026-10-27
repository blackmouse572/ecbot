import { Skeleton } from "@repo/ui/common-components";

/** Placeholder rows while a page of agents loads. */
export const AgentLinkRowSkeletons = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        data-testid="agent-skeleton"
        className="flex items-center justify-between rounded-lg border border-ui-border-base p-3"
      >
        <div className="flex flex-col gap-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-7 w-14" />
      </div>
    ))}
  </>
);
