import { Skeleton } from "@repo/ui/common-components";
import type { FC } from "react";

const ROW_WIDTHS = ["w-48", "w-36", "w-56", "w-40"];

/** Placeholder rows shown while the server search runs and nothing matched yet. */
export const CommandPaletteLoading: FC = () => (
  <div aria-hidden className="flex flex-col gap-y-1 p-2">
    <Skeleton className="mx-3 my-2.5 h-2.5 w-16" />
    {ROW_WIDTHS.map((width) => (
      <div key={width} className="flex items-center gap-x-2 px-3 py-2">
        <Skeleton className="size-4" />
        <Skeleton className={`h-3 ${width}`} />
      </div>
    ))}
  </div>
);
