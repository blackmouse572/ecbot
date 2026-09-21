import { CreatedAtCell } from "@/components/table/table-cells/common/created-at-cell";
import { Badge } from "@medusajs/ui";
import type { SkillListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const columnHelper = createColumnHelper<SkillListResponseDto>();

export const useSkillTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: () => t("fields.name"),
        cell: ({ row }) => (
          <div className="flex items-center gap-x-2">
            <span className="txt-compact-small font-medium">
              {row.original.name}
            </span>
            {row.original.isBuiltin && (
              <Badge size="2xsmall" color="purple" className="shrink-0">
                {t("skills.builtin")}
              </Badge>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: "description",
        header: () => t("fields.description"),
        cell: ({ row }) => (
          <span className="txt-compact-small line-clamp-1 text-ui-fg-subtle">
            {row.original.description ?? ""}
          </span>
        ),
      }),
      columnHelper.display({
        id: "updatedAt",
        header: () => t("fields.updatedAt"),
        cell: ({ row }) => <CreatedAtCell date={row.original.updatedAt} />,
      }),
    ],
    [t],
  );
};
