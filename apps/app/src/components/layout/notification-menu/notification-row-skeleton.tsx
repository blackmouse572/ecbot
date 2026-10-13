import { Skeleton } from "@repo/ui/common-components";
import type { FC } from "react";

export const NotificationRowSkeleton: FC = () => (
  <div className="flex items-start gap-x-3 p-2">
    <Skeleton className="size-7 rounded-full" />
    <div className="flex flex-1 flex-col gap-y-1.5">
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-full" />
    </div>
  </div>
);
