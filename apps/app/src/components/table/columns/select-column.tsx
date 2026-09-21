import { Checkbox } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";

/**
 * Checkbox column for multi-row selection.
 *
 * The id must stay `"select"` — `DataTableRoot` looks that id up to add the
 * sticky first-column styling and to know the column is not a data column.
 */
export const createSelectColumn = <TData,>() =>
  createColumnHelper<TData>().display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  });
