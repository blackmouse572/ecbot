import { render, screen } from "@testing-library/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { _DataTable } from "./data-table";

const EmptyTable = ({
  queryObject,
}: {
  queryObject: Record<string, unknown>;
}) => {
  const table = useReactTable({
    data: [],
    columns: [],
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <_DataTable
      table={table}
      columns={[]}
      count={0}
      pageSize={10}
      queryObject={queryObject}
      noRecords={{ title: "Nothing yet" }}
    />
  );
};

const renderEmpty = (queryObject: Record<string, unknown>) =>
  render(<EmptyTable queryObject={queryObject} />, { wrapper: MemoryRouter });

describe("_DataTable empty state", () => {
  beforeAll(() => {
    // jsdom has no Element.scroll; the table root scrolls on page change.
    Element.prototype.scroll = vi.fn();
  });

  it("treats pagination and sorting params as no query", () => {
    renderEmpty({
      page: "2",
      perPage: "20",
      order: "-createdAt",
      orderBy: "name",
      orderDirection: "ASC",
    });

    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  it("does not show the no-records state while a search is active", () => {
    renderEmpty({ q: "acme" });

    expect(screen.queryByText("Nothing yet")).not.toBeInTheDocument();
  });
});
