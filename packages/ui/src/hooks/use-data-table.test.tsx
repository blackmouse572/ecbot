import { createColumnHelper } from "@tanstack/react-table";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { parsePageSize, useDataTable } from "./use-data-table";

type Row = { id: string };

const columns = [createColumnHelper<Row>().accessor("id", { header: "Id" })];
const data: Row[] = [{ id: "1" }];

function renderDataTable(search = "") {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[`/${search}`]}>{children}</MemoryRouter>
  );

  return renderHook(
    () => ({
      ...useDataTable({ data, columns, count: 100, pageSize: 20 }),
      location: useLocation(),
    }),
    { wrapper },
  );
}

describe("useDataTable pagination from the URL", () => {
  it("reads a 1-based page param into a 0-based page index", () => {
    const { result } = renderDataTable("?page=3");

    expect(result.current.table.getState().pagination.pageIndex).toBe(2);
  });

  it("defaults to the first page when no param is present", () => {
    const { result } = renderDataTable();

    expect(result.current.table.getState().pagination).toMatchObject({
      pageIndex: 0,
      pageSize: 20,
    });
  });

  // These all come straight off the URL bar, so they are user-reachable by a
  // typo or a stale bookmark. Left unguarded they reach TanStack as NaN and the
  // footer renders "NaN of NaN pages".
  it.each([
    ["?page=abc", "not a number"],
    ["?page=0", "below the first page"],
    ["?page=-2", "negative"],
  ])("clamps %s (%s) to the first page", (search) => {
    const { result } = renderDataTable(search);

    expect(result.current.table.getState().pagination.pageIndex).toBe(0);
  });

  it.each([
    ["?perPage=abc", "not a number"],
    ["?perPage=0", "zero"],
  ])("falls back to the default page size for %s (%s)", (search) => {
    const { result } = renderDataTable(search);

    expect(result.current.table.getState().pagination.pageSize).toBe(20);
    expect(result.current.table.getPageCount()).toBe(5);
  });

  // The cases above cannot fail if the hook stops reading the URL at all: they
  // expect 20, which is also the hardcoded default. These pin the reading half
  // — the same half the consumers' bake functions now size from.
  it("adopts a valid perPage from the URL", () => {
    const { result } = renderDataTable("?perPage=50");

    expect(result.current.table.getState().pagination.pageSize).toBe(50);
    expect(result.current.table.getPageCount()).toBe(2); // count 100 / 50
  });

  it("clamps an oversized perPage to what the API will honour", () => {
    const { result } = renderDataTable("?perPage=5000");

    expect(result.current.table.getState().pagination.pageSize).toBe(100);
    expect(result.current.table.getPageCount()).toBe(1);
  });
});

// Exported so the consumer apps' query-baking functions can size their API
// request from the same URL value the table sizes its footer from. When only the
// table honoured `?perPage=`, the two disagreed and rows became unreachable:
// the footer paged in 50s while the API kept returning 20.
describe("parsePageSize", () => {
  it("takes a valid page size from the URL", () => {
    expect(parsePageSize("50", 20)).toBe(50);
  });

  it.each<[string | null | undefined, string]>([
    ["abc", "not a number"],
    ["0", "zero"],
    ["-5", "negative"],
    ["1.5", "not an integer"],
    ["", "empty"],
    [null, "absent"],
    [undefined, "undefined"],
  ])("falls back for %s (%s)", (value) => {
    expect(parsePageSize(value, 20)).toBe(20);
  });

  // The backend clamps to PAGINATION_DEFAULT_MAX_PER_PAGE (100) regardless, so
  // an unclamped client would size its footer off a number the API refuses.
  it("clamps to the maximum the API will honour", () => {
    expect(parsePageSize("5000", 20)).toBe(100);
    expect(parsePageSize("100", 20)).toBe(100);
  });

  // The fallback is clamped too — a consumer whose own pageSize exceeds the API
  // maximum would otherwise desync from the API on the no-param path, which is
  // the branch the guard above never reaches.
  it("clamps the fallback as well as the URL value", () => {
    expect(parsePageSize(null, 150)).toBe(100);
  });
});

describe("useDataTable pagination written back to the URL", () => {
  it("writes a 1-based page param when leaving the first page", () => {
    const { result } = renderDataTable();

    act(() => result.current.table.setPageIndex(2));

    expect(result.current.location.search).toContain("page=3");
  });

  it("drops the page param entirely on the first page", () => {
    const { result } = renderDataTable("?page=3");

    act(() => result.current.table.setPageIndex(0));

    expect(result.current.location.search).not.toContain("page");
  });

  it("namespaces the param when a prefix is given", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/?page=9"]}>{children}</MemoryRouter>
    );
    const { result } = renderHook(
      () => ({
        ...useDataTable({ data, columns, count: 100, prefix: "ph" }),
        location: useLocation(),
      }),
      { wrapper },
    );

    // The outer table's own `page` must not be read as this table's page.
    expect(result.current.table.getState().pagination.pageIndex).toBe(0);

    act(() => result.current.table.setPageIndex(1));

    expect(result.current.location.search).toContain("ph_page=2");
    expect(result.current.location.search).toContain("page=9");
  });
});
