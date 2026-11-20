import { StatusBadge } from "@medusajs/ui";
import type { ToolListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TOOL_STATUS_COLOR } from "../../../../constants";
import { ToolInUseCell } from "../tool-in-use-cell";
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
        // A working tool needs no badge; only one that needs the owner does.
        cell: ({ row }) => {
          const { status } = row.original;

          if (status === "ACTIVE") return null;

          const key = status.toLowerCase().replace(/_/g, "");
          return (
            <StatusBadge color={TOOL_STATUS_COLOR[status] ?? "grey"}>
              {t(`tools.list.filters.statusOptions.${key}`, {
                defaultValue: status,
              })}
            </StatusBadge>
          );
        },
      }),
      columnHelper.display({
        id: "inUse",
        header: () => t("tools.list.columns.inUse"),
        cell: ({ row }) => <ToolInUseCell count={row.original.chatbotCount} />,
      }),
    ],
    [t],
  );
};
