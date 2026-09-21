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

type UseDataTableProps<TData> = {
  data?: TData[];
  // See DataTableRootProps.columns for why the value type is `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
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

// `page` and `perPage` come straight off the URL bar, so a typo or a stale
// bookmark can put anything in them. Left unguarded, `Number("abc") - 1` reaches
// TanStack as NaN and the footer renders "NaN of NaN pages".
const parsePageIndex = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page - 1 : 0; // page is 1-based
};

/**
 * The API's PAGINATION_DEFAULT_MAX_PER_PAGE. The backend clamps to this itself,
 * so an unclamped client would size its footer off a number the API refuses.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Exported because the table and the consumer's query-baking function must size
 * from the SAME URL value. While only the table honoured `?perPage=`, the two
 * disagreed — the footer paged in 50s while the API kept returning 20, and the
 * rows in between became unreachable with no sign anything was wrong.
 */
export const parsePageSize = (
  value: string | null | undefined,
  fallback: number,
): number => {
  const perPage = Number(value);
  const size = Number.isInteger(perPage) && perPage >= 1 ? perPage : fallback;
  // Clamp the fallback too: a consumer whose own pageSize exceeds the API max
  // would otherwise size its footer off a number the API silently reduces,
  // which is the very desync this function exists to prevent.
  return Math.min(size, MAX_PAGE_SIZE);
};

export const useDataTable = <TData>({
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
}: UseDataTableProps<TData>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageKey = `${prefix ? `${prefix}_` : ""}page`;
  const perPageKey = `${prefix ? `${prefix}_` : ""}perPage`;

  const initialPageFromUrl = searchParams.get(pageKey);
  const initialPerPageFromUrl = searchParams.get(perPageKey);

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: parsePageIndex(initialPageFromUrl),
    pageSize: parsePageSize(initialPerPageFromUrl, _pageSize),
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

    const targetPageIndex = parsePageIndex(pageFromUrl);
    const targetPageSize = parsePageSize(perPageFromUrl, _pageSize);

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
  ]);

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const newPaginationState =
      typeof updater === "function"
        ? updater({ pageIndex, pageSize })
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
    return newPaginationState;
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
    onPaginationChange: enablePagination ? onPaginationChange : undefined,
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
