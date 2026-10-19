import { clx } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { NoRecords } from "../../common/empty-table-content";
import { Skeleton } from "../../common/skeleton";

type ChartPlaceholderProps = {
  isLoading?: boolean;
  icon: ReactNode;
  title: string;
  message?: string;
  /** The height of the content it stands in for, so nothing shifts when
   * data arrives. */
  className: string;
};

/** Stands in for a chart or list while it loads or when it has no data. */
export const ChartPlaceholder: FC<ChartPlaceholderProps> = ({
  isLoading,
  icon,
  title,
  message,
  className,
}) =>
  isLoading ? (
    <Skeleton className={clx("w-full flex-none rounded-md", className)} />
  ) : (
    <NoRecords
      size="small"
      className={clx("flex-none", className)}
      icon={icon}
      title={title}
      message={message}
    />
  );
