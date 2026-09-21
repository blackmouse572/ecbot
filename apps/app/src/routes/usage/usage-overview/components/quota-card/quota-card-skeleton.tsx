import { Container } from "@medusajs/ui";
import { Skeleton } from "@repo/ui/common-components";

/** Mirrors QuotaCard's two-row layout so the page doesn't jump when data lands. */
export function QuotaCardSkeleton() {
  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-3 px-6 py-4">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </Container>
  );
}
