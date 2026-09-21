import { createDataTableColumnHelper } from "@medusajs/ui";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../test/i18n";
import { DataTable } from "./data-table";

type Row = { id: string; name: string };

const rows: Row[] = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
  { id: "3", name: "Gamma" },
];

const columnHelper = createDataTableColumnHelper<Row>();
const columns = [columnHelper.accessor("name", { header: "Name" })];

// Mirrors the config PR 12b/12c use for unpaginated reference grids
// (role-permission-grid.tsx): no search, no pagination, auto layout.
function Harness({ data = rows }: { data?: Row[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      enableSearch={false}
      enablePagination={false}
      layout="auto"
    />
  );
}

describe("DataTable (v4)", () => {
  it("renders every row and the column header", () => {
    renderWithProviders(<Harness />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("does not render a search input", () => {
    renderWithProviders(<Harness />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not render pagination controls", () => {
    renderWithProviders(<Harness />);

    expect(
      screen.queryByRole("button", { name: /next/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /prev/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when there is no data", () => {
    renderWithProviders(
      <DataTable
        data={[]}
        columns={columns}
        getRowId={(row) => row.id}
        enableSearch={false}
        enablePagination={false}
        layout="auto"
        emptyState={{
          empty: { heading: "Nothing here", description: "No rows yet" },
        }}
      />,
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});

// role-permission-grid.tsx (the only current consumer) always disables search
// and pagination, so the harness above never exercises the component's actual
// defaults (both default to `true`).
describe("DataTable (v4) with default search and pagination enabled", () => {
  function DefaultsHarness({ data = rows }: { data?: Row[] }) {
    return (
      <DataTable data={data} columns={columns} getRowId={(row) => row.id} />
    );
  }

  it("renders a search input", () => {
    renderWithProviders(<DefaultsHarness />);

    expect(
      screen.getByPlaceholderText(uiTestI18nResources.filters.searchLabel),
    ).toBeInTheDocument();
  });

  it("renders pagination controls", () => {
    renderWithProviders(<DefaultsHarness />);

    expect(
      screen.getByRole("button", { name: uiTestI18nResources.general.next }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uiTestI18nResources.general.prev }),
    ).toBeInTheDocument();
  });
});
