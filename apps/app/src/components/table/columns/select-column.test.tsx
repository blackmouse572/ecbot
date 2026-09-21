import { render, screen } from "@testing-library/react";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { _DataTable } from "@/components/table/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { createSelectColumn } from "./select-column";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
type G = typeof globalThis & { ResizeObserver: typeof ResizeObserverMock };
(globalThis as G).ResizeObserver =
  (globalThis as G).ResizeObserver ?? ResizeObserverMock;
if (!HTMLElement.prototype.scroll) {
  HTMLElement.prototype.scroll = () => {};
}

type Row = { id: string; name: string };
const rows: Row[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
];

const helper = createColumnHelper<Row>();

const Harness = () => {
  const [rowSelection, setRowSelection] = useState({});
  const columns = [
    createSelectColumn<Row>(),
    helper.accessor("name", { header: "Name", cell: (i) => i.getValue() }),
  ];

  const { table } = useDataTable({
    data: rows,
    columns: columns as never,
    count: rows.length,
    enablePagination: true,
    pageSize: 10,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    rowSelection: { state: rowSelection, updater: setRowSelection },
  });

  return (
    <_DataTable
      table={table}
      columns={columns as never}
      count={rows.length}
      pageSize={10}
      pagination
      queryObject={{}}
      commands={[{ label: "Delete", shortcut: "d", action: async () => {} }]}
      navigateTo={(row) => `${row.original.id}`}
    />
  );
};

describe("createSelectColumn", () => {
  it("renders a checkbox in the header and in every row", () => {
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );

    expect(screen.getByText("Alpha")).toBeDefined();

    const checkboxes = screen.queryAllByRole("checkbox");
    expect(checkboxes.length).toBe(rows.length + 1); // header + one per row
  });
});
