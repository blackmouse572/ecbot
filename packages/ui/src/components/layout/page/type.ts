import type { ReactNode } from "react";

export interface PageProps<TData> {
  children: ReactNode;
  data?: TData;
  hasOutlet?: boolean;
}
