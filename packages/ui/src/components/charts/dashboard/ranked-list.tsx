import { Container, Heading, Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";

export type RankedRow = {
  key: string;
  label: string;
  count: number;
  /** A logo, emoji or icon shown before the label. */
  icon?: ReactNode;
  /** Makes the row a link, e.g. to the list it counts. */
  href?: string;
};

type RankedRowsProps = {
  rows: RankedRow[];
  /** Shown when there are no rows. */
  emptyLabel: string;
  isLoading?: boolean;
  /** Bars are a share of this; defaults to the biggest row. */
  max?: number;
  formatCount?: (count: number) => string;
  /** Shown next to each count, e.g. the share of the first funnel step. */
  suffix?: (row: RankedRow) => string | undefined;
  /** Renders a row's link; the app passes its router link. */
  renderLink?: (row: RankedRow, children: ReactNode) => ReactNode;
};

/** The rows of a top-N list: each with a bar sized against the biggest. */
export const RankedRows: FC<RankedRowsProps> = ({
  rows,
  emptyLabel,
  isLoading,
  max,
  formatCount = String,
  suffix,
  renderLink,
}) => {
  const scale = max ?? Math.max(1, ...rows.map((r) => r.count));

  if (rows.length === 0) {
    return (
      <Text size="small" className="text-ui-fg-muted py-6 text-center">
        {isLoading ? "–" : emptyLabel}
      </Text>
    );
  }
  return (
    <ul className="flex flex-col gap-y-2">
      {rows.map((row) => {
        const content = (
          <>
            <div
              aria-hidden
              className="bg-ui-bg-highlight absolute inset-y-0 left-0 rounded-md"
              style={{ width: `${Math.max(2, (row.count / scale) * 100)}%` }}
            />
            <div className="relative flex items-center justify-between gap-x-3 px-2 py-1">
              <div className="flex min-w-0 items-center gap-x-2">
                {row.icon && (
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {row.icon}
                  </span>
                )}
                <Text size="small" className="truncate" title={row.label}>
                  {row.label}
                </Text>
              </div>
              <Text
                size="small"
                weight="plus"
                className="shrink-0 tabular-nums"
              >
                {formatCount(row.count)}
                {suffix?.(row) && (
                  <span className="text-ui-fg-muted ml-1 font-normal">
                    {suffix(row)}
                  </span>
                )}
              </Text>
            </div>
          </>
        );
        return (
          <li key={row.key} className="relative">
            {row.href && renderLink ? renderLink(row, content) : content}
          </li>
        );
      })}
    </ul>
  );
};

type RankedListProps = RankedRowsProps & { title: string };

/** A top-N list in its own card. */
export const RankedList: FC<RankedListProps> = ({ title, ...rest }) => (
  <Container className="flex flex-col gap-y-3">
    <Heading level="h2">{title}</Heading>
    <RankedRows {...rest} />
  </Container>
);
