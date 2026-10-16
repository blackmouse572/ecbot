import { Container, Heading, Table, Text, clx } from "@medusajs/ui";
import type { ReactNode } from "react";

export type SimpleColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Numbers sit right-aligned. */
  numeric?: boolean;
};

type SimpleTableProps<T> = {
  title: string;
  rows: T[];
  columns: SimpleColumn<T>[];
  rowKey: (row: T) => string;
  emptyLabel: string;
};

/** A small, read-only table in its own card: a breakdown, not a list page. */
export function SimpleTable<T>({
  title,
  rows,
  columns,
  rowKey,
  emptyLabel,
}: SimpleTableProps<T>) {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{title}</Heading>
      </div>
      {rows.length === 0 ? (
        <Text size="small" className="text-ui-fg-muted py-6 text-center">
          {emptyLabel}
        </Text>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                {columns.map((c) => (
                  <Table.HeaderCell
                    key={c.key}
                    className={clx(
                      "whitespace-nowrap",
                      c.numeric && "text-right",
                    )}
                  >
                    {c.header}
                  </Table.HeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={rowKey(row)}>
                  {columns.map((c) => (
                    <Table.Cell
                      key={c.key}
                      className={clx(
                        "whitespace-nowrap",
                        c.numeric && "text-right tabular-nums",
                      )}
                    >
                      {c.cell(row)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Container>
  );
}
