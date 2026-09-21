import type { Filter } from "..";
import { DataTableFilter } from "../data-table-filter";
import {
  DataTableOrderBy,
  type DataTableOrderByKey,
} from "../data-table-order-by";
import { DataTableSearch } from "../data-table-search";

/** `true` shows the search box; `"autofocus"` also focuses it on mount. */
type SearchMode = boolean | "autofocus";

export interface DataTableQueryProps<TData> {
  search?: SearchMode;
  orderBy?: DataTableOrderByKey<TData>[];
  filters?: Filter[];
  prefix?: string;
}

export const DataTableQuery = <TData,>({
  search,
  orderBy,
  filters,
  prefix,
}: DataTableQueryProps<TData>) => {
  return (
    (search || orderBy || filters || prefix) && (
      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div className="w-full max-w-[60%]">
          {filters && filters.length > 0 && (
            <DataTableFilter filters={filters} prefix={prefix} />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-x-2">
          {search && (
            <DataTableSearch
              prefix={prefix}
              autofocus={search === "autofocus"}
            />
          )}
          {orderBy && <DataTableOrderBy keys={orderBy} prefix={prefix} />}
        </div>
      </div>
    )
  );
};
