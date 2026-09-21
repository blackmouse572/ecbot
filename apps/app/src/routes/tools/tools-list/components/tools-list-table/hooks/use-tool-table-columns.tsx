import { CreatedAtCell } from "@/components/table/table-cells/common/created-at-cell";
import { StatusBadge } from "@medusajs/ui";
import type { ToolListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TOOL_STATUS_COLOR } from "../../../../constants";
import { ToolNameCell } from "../tool-name-cell";

const columnHelper = createColumnHelper<ToolListResponseDto>();

export const useToolTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: () => t("tools.list.columns.name"),
        cell: ({ row }) => <ToolNameCell tool={row.original} />,
      }),
      columnHelper.display({
        id: "status",
        header: () => t("tools.list.columns.status"),
        cell: ({ row }) => {
          const color = TOOL_STATUS_COLOR[row.original.status] ?? "grey";
          const key = row.original.status.toLowerCase().replace(/_/g, "");
          return (
            <StatusBadge color={color}>
              {t(`tools.list.filters.statusOptions.${key}`, {
                defaultValue: row.original.status,
              })}
            </StatusBadge>
          );
        },
      }),
      columnHelper.display({
        id: "createdAt",
        header: () => t("tools.list.columns.createdAt"),
        cell: ({ row }) => <CreatedAtCell date={row.original.createdAt} />,
      }),
    ],
    [t],
  );
};
