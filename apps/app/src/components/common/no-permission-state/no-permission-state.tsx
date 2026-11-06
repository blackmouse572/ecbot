import { Text } from "@medusajs/ui";
import type { ReactNode } from "react";

type NoPermissionStateProps = {
  icon: ReactNode;
  message: string;
  "data-testid"?: string;
};

/** Stands in for a list the signed-in member may not read. */
export const NoPermissionState = ({
  icon,
  message,
  "data-testid": testId,
}: NoPermissionStateProps) => (
  <div
    className="flex flex-col items-center gap-y-2 px-6 py-12 text-center"
    data-testid={testId}
  >
    <span className="text-ui-fg-muted">{icon}</span>
    <Text size="small" className="text-ui-fg-subtle max-w-sm">
      {message}
    </Text>
  </div>
);
