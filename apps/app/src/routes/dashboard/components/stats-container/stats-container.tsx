import type { ReactNode } from "react";

export interface StatsContainerProps {
  children: ReactNode;
}

export function StatsContainer({ children }: StatsContainerProps) {
  return (
    <div className="rounded-lg bg-ui-bg-field border">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x p-4">
        {children}
      </div>
    </div>
  );
}
