import { createColumnHelper } from "@tanstack/react-table";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDataTable } from "../../../hooks/use-data-table";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../test/i18n";
import { _DataTable } from "./data-table";

type Row = { id: string; name: string };

const rows: Row[] = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
];

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.display({ id: "actions", cell: () => "…" }),
];

type HarnessProps = {
  data?: Row[];
  count?: number;
  isLoading?: boolean;
  queryObject?: Record<string, unknown>;
  search?: boolean;
  orderBy?: { key: keyof Row; label: string }[];
};

function Harness({
  data = rows,
  count = rows.length,
  isLoading = false,
  queryObject = {},
  search = false,
  orderBy,
}: HarnessProps) {
  const { table } = useDataTable({ data, columns, count, pageSize: 20 });

  return (
    <_DataTable
      table={table}
      columns={columns}
      count={count}
      pageSize={20}
      pagination
      isLoading={isLoading}
      queryObject={queryObject}
      search={search}
      orderBy={orderBy}
    />
  );
}

describe("_DataTable", () => {
  it("renders the rows and the pagination footer", () => {
    renderWithProviders(<Harness />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uiTestI18nResources.general.next }),
    ).toBeInTheDocument();
  });

  it("renders the search input only when search is enabled", () => {
    const { unmount } = renderWithProviders(<Harness />);
    expect(
      screen.queryByPlaceholderText(uiTestI18nResources.general.search),
    ).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<Harness search />);
    expect(
      screen.getByPlaceholderText(uiTestI18nResources.general.search),
    ).toBeInTheDocument();
  });

  it("renders the skeleton instead of the table while loading", () => {
    renderWithProviders(<Harness isLoading />);

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  // The noRecords/noResults split is the whole point of passing queryObject in:
  // an empty list with no active query means "nothing exists yet", an empty list
  // with an active query means "your filters matched nothing".
  it("shows the no-records state when empty with no active query", () => {
    renderWithProviders(<Harness data={[]} count={0} />);

    expect(
      screen.getByText(uiTestI18nResources.general.noRecordsTitle),
    ).toBeInTheDocument();
  });

  it("shows the no-results state when empty with an active query", () => {
    renderWithProviders(
      <Harness data={[]} count={0} queryObject={{ search: "zzz" }} />,
    );

    expect(
      screen.getByText(uiTestI18nResources.general.noResultsTitle),
    ).toBeInTheDocument();
  });

  it("ignores empty query values when deciding no-records vs no-results", () => {
    renderWithProviders(
      <Harness data={[]} count={0} queryObject={{ search: undefined }} />,
    );

    expect(
      screen.getByText(uiTestI18nResources.general.noRecordsTitle),
    ).toBeInTheDocument();
  });
});

// `count` comes from `_metadata.pagination.total`, which the API contract types
// as OPTIONAL — every consumer hook therefore writes `?? 0`. That fallback makes
// "the envelope was missing" indistinguishable from "there are genuinely zero
// rows", and the empty state used to win, discarding rows that were fetched fine.
describe("_DataTable when count disagrees with the rows", () => {
  it("renders the rows when count is 0 but the table has rows", () => {
    renderWithProviders(<Harness data={rows} count={0} />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(
      screen.queryByText(uiTestI18nResources.general.noRecordsTitle),
    ).not.toBeInTheDocument();
  });

  it("renders the rows rather than the no-results state under an active query", () => {
    renderWithProviders(
      <Harness data={rows} count={0} queryObject={{ search: "alp" }} />,
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(
      screen.queryByText(uiTestI18nResources.general.noResultsTitle),
    ).not.toBeInTheDocument();
  });

  // Guards the fix from over-reaching: a genuinely empty list must still say so.
  it("still shows the no-records state when there are no rows either", () => {
    renderWithProviders(<Harness data={[]} count={0} />);

    expect(
      screen.getByText(uiTestI18nResources.general.noRecordsTitle),
    ).toBeInTheDocument();
  });
});

// Pagination (`page`/`perPage`) and sort state (`orderBy`/`orderDirection`, the
// parsed form of the order-by URL param) travel in `queryObject` alongside the
// filters, so they must not be mistaken for one: an empty list under only one
// of these has had nothing searched for and is still "no records".
describe("_DataTable no-records vs no-results", () => {
  it.each(["page", "perPage", "orderBy", "orderDirection"])(
    "does not treat %s as an active query",
    (key) => {
      renderWithProviders(
        <Harness data={[]} count={0} queryObject={{ [key]: "x" }} />,
      );

      expect(
        screen.getByText(uiTestI18nResources.general.noRecordsTitle),
      ).toBeInTheDocument();
    },
  );

  it("still treats a real filter as an active query", () => {
    renderWithProviders(
      <Harness data={[]} count={0} queryObject={{ page: "2", status: "X" }} />,
    );

    expect(
      screen.getByText(uiTestI18nResources.general.noResultsTitle),
    ).toBeInTheDocument();
  });
});

describe("_DataTable order-by control", () => {
  it("gives the order-by trigger an accessible name", () => {
    // It is an icon-only IconButton, so without an aria-label a screen reader
    // announces just "button" and the control is unreachable by name.
    renderWithProviders(<Harness orderBy={[{ key: "name", label: "Name" }]} />);

    expect(
      screen.getByRole("button", { name: uiTestI18nResources.general.orderBy }),
    ).toBeInTheDocument();
  });
});
