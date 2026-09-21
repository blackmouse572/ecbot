import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

type UseDataTableProps<TData, A> = {
  // Added A as a generic parameter with default 'any'
  data?: TData[];
  columns: ColumnDef<TData, A>[];
  count?: number;
  pageSize?: number;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  rowSelection?: {
    state: RowSelectionState;
    updater: OnChangeFn<RowSelectionState>;
  };
  enablePagination?: boolean;
  enableExpandableRows?: boolean;
  getRowId?: (original: TData, index: number) => string;
  getSubRows?: (original: TData) => TData[];
  meta?: Record<string, unknown>;
  prefix?: string;
};

export const useDataTable = <TData, A>({
  // Added A as a generic parameter
  data = [],
  columns,
  count = 0,
  pageSize: _pageSize = 20,
  enablePagination = true,
  enableRowSelection = false,
  enableExpandableRows = false,
  rowSelection: _rowSelection,
  getSubRows,
  getRowId,
  meta,
  prefix,
}: UseDataTableProps<TData, A>) => {
  // Updated to use UseDataTableProps<TData, A>
  const [searchParams, setSearchParams] = useSearchParams();
  const pageKey = `${prefix ? `${prefix}_` : ""}page`;
  const perPageKey = `${prefix ? `${prefix}_` : ""}perPage`;

  const initialPageFromUrl = searchParams.get(pageKey);
  const initialPerPageFromUrl = searchParams.get(perPageKey);

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: initialPageFromUrl ? Number(initialPageFromUrl) - 1 : 0, // page is 1-based
    pageSize: initialPerPageFromUrl ? Number(initialPerPageFromUrl) : _pageSize,
  });
  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize],
  );
  const [localRowSelection, setLocalRowSelection] = useState({});
  const rowSelection = _rowSelection?.state ?? localRowSelection;
  const setRowSelection = _rowSelection?.updater ?? setLocalRowSelection;

  useEffect(() => {
    if (!enablePagination) {
      return;
    }

    const pageFromUrl = searchParams.get(pageKey);
    const perPageFromUrl = searchParams.get(perPageKey);

    const targetPageIndex = pageFromUrl ? Number(pageFromUrl) - 1 : 0; // page is 1-based
    const targetPageSize = perPageFromUrl ? Number(perPageFromUrl) : _pageSize;

    if (targetPageIndex !== pageIndex || targetPageSize !== pageSize) {
      setPagination({
        pageIndex: targetPageIndex,
        pageSize: targetPageSize,
      });
    }
  }, [
    searchParams,
    pageKey,
    perPageKey,
    _pageSize,
    enablePagination,
    pageIndex,
    pageSize,
    setPagination,
  ]); // Added setPagination to dependencies

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    // Explicitly typed onPaginationChange
    const newPaginationState =
      typeof updater === "function"
        ? updater({ pageIndex, pageSize }) // Pass current state if updater is a function
        : updater;

    setPagination(newPaginationState);

    setSearchParams(
      (prevParams) => {
        const newSearch = new URLSearchParams(prevParams);
        const { pageIndex: newPageIndex, pageSize: newPageSize } =
          newPaginationState;

        if (newPageIndex === 0) {
          newSearch.delete(pageKey);
        } else {
          newSearch.set(pageKey, String(newPageIndex + 1)); // page is 1-based
        }

        if (newPageSize === _pageSize) {
          newSearch.delete(perPageKey);
        } else {
          newSearch.set(perPageKey, String(newPageSize));
        }

        return newSearch;
      },
      { replace: true }, // Optional: use replace to avoid polluting browser history
    );
    return newPaginationState; // Return the new state
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection: rowSelection, // We always pass a selection state to the table even if it's not enabled
      pagination: enablePagination ? pagination : undefined,
    },
    pageCount: Math.ceil((count ?? 0) / pageSize),
    enableRowSelection,
    getRowId,
    getSubRows,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onPaginationChange: enablePagination
      ? onPaginationChange // No need to cast if onPaginationChange is correctly typed
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getExpandedRowModel: enableExpandableRows
      ? getExpandedRowModel()
      : undefined,
    manualPagination: enablePagination ? true : undefined,
    meta,
  });

  return { table };
};
