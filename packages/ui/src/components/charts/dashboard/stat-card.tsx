import { Container, Text, clx } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { deltaPercent } from "./delta-percent";

type StatCardProps = {
  label: string;
  current?: number;
  previous?: number;
  /** Formats the value, e.g. as a percent or a compact number. */
  format: (value: number) => string;
  /** A line under the value, e.g. an all-time total or what is missing. */
  hint?: ReactNode;
  /** A fall is good news (a handoff rate); colours the change the other way. */
  lowerIsBetter?: boolean;
  isLoading?: boolean;
};

/** One number for the period and its change against the period before. */
export const StatCard: FC<StatCardProps> = ({
  label,
  current,
  previous,
  format,
  hint,
  lowerIsBetter,
  isLoading,
}) => {
  const ready = !isLoading && current !== undefined;
  const delta =
    ready && previous !== undefined ? deltaPercent(current, previous) : null;
  const good = delta !== null && (lowerIsBetter ? delta < 0 : delta > 0);
  const bad = delta !== null && (lowerIsBetter ? delta > 0 : delta < 0);

  return (
    <Container className="flex flex-col gap-y-1 px-4 py-3">
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <div className="flex items-baseline gap-x-2">
        <Text size="xlarge" weight="plus" className="tabular-nums">
          {ready ? format(current) : "–"}
        </Text>
        {delta !== null && (
          <Text
            size="xsmall"
            weight="plus"
            className={clx(
              "tabular-nums",
              good && "text-ui-tag-green-text",
              bad && "text-ui-tag-red-text",
              delta === 0 && "text-ui-fg-muted",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}%
          </Text>
        )}
      </div>
      {hint && ready && (
        <Text size="xsmall" className="text-ui-fg-muted tabular-nums">
          {hint}
        </Text>
      )}
    </Container>
  );
};
