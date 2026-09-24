import type { ReactNode } from "react";

/** Header box that fills the row height so labels line up with the cells. */
export const headerLabel = (label: ReactNode) => (
  <div className="flex h-full w-full items-center gap-1">{label}</div>
);
