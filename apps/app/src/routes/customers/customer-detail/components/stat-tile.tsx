import { Container, Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

/**
 * StatCard's look for a value that is not a number to compare, such as a
 * date or a consent state.
 */
export const StatTile: FC<{
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}> = ({ label, value, hint }) => (
  <Container className="flex min-w-0 flex-col gap-y-1 px-4 py-3">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="xlarge" weight="plus" className="truncate tabular-nums">
      {value}
    </Text>
    {hint && (
      <Text size="xsmall" className="text-ui-fg-muted truncate">
        {hint}
      </Text>
    )}
  </Container>
);
