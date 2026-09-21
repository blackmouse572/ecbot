import { clx } from "@medusajs/ui";
import { NoRecords, TableSkeleton, type NoResultsProps } from "../../common";
import { memo } from "react";
import { DataTableQuery, type DataTableQueryProps } from "./data-table-query";
import { DataTableRoot, type DataTableRootProps } from "./data-table-root";

interface DataTableProps<TData>
  extends
    Omit<DataTableRootProps<TData>, "noResults">,
    DataTableQueryProps<TData> {
  isLoading?: boolean;
  pageSize: number;
  queryObject?: Record<string, unknown>;
  noRecords?: Pick<NoResultsProps, "title" | "message">;
}

const MemoizedDataTableQuery = memo(DataTableQuery) as typeof DataTableQuery;

export const _DataTable = <TData,>({
  table,
  columns,
  pagination,
  navigateTo,
  commands,
  count = 0,
  search = false,
  orderBy,
  filters,
  prefix,
  queryObject = {},
  pageSize,
  isLoading = false,
  noHeader = false,
  layout = "fit",
  noRecords: noRecordsProps = {},
}: DataTableProps<TData>) => {
  const rowCount = table.getRowModel().rows.length;

  if (isLoading) {
    return (
      <TableSkeleton
        layout={layout}
        rowCount={pageSize}
        search={!!search}
        filters={!!filters?.length}
        orderBy={!!orderBy?.length}
        pagination={!!pagination}
      />
    );
  }

  // `page`/`perPage` are pagination, not filters, and `orderBy`/`orderDirection`
  // (the parsed form of the order-by URL param, see useQueryParamsWithSort) are
  // sort state, not a search. Counting any of them here would make an empty
  // list under a plain sort say "your search matched nothing" when nothing was
  // searched for at all.
  const noQuery = Object.entries(queryObject).every(
    ([key, value]) =>
      key === "page" ||
      key === "perPage" ||
      key === "orderBy" ||
      key === "orderDirection" ||
      !value,
  );
  // `count` comes from the response's `_metadata.pagination.total`, which the
  // API types as optional — so every consumer hook falls back to 0, making
  // "the envelope was missing" look identical to "there is nothing to show".
  // Rows the request actually returned are the stronger evidence: only claim
  // emptiness when the table has none either.
  const isEmpty = count === 0 && rowCount === 0;
  const noResults = isEmpty && !noQuery;
  const noRecords = isEmpty && noQuery;

  if (noRecords) {
    return (
      <NoRecords
        className={clx({
          "flex h-full flex-col overflow-hidden": layout === "fill",
        })}
        {...noRecordsProps}
      />
    );
  }

  return (
    <div
      className={clx(
        "divide-y",
        {
          "flex h-full flex-col overflow-hidden": layout === "fill",
        },
        "[&_[data-slot='no-result']]:min-h-[400px]",
      )}
    >
      <MemoizedDataTableQuery
        search={search}
        orderBy={orderBy}
        filters={filters}
        prefix={prefix}
      />
      <DataTableRoot
        table={table}
        count={count}
        columns={columns}
        pagination
        navigateTo={navigateTo}
        commands={commands}
        noResults={noResults}
        noHeader={noHeader}
        layout={layout}
      />
    </div>
  );
};
