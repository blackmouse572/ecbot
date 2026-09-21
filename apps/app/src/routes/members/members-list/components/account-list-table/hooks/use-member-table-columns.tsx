import { CreatedAtCell } from "@/components/table/table-cells/common/created-at-cell";
import { useDate } from "@/hooks/use-date";
import { defaultNs } from "@/i18n";
import { Tooltip } from "@medusajs/ui";
import type { WorkspaceMemberListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MembersNameCell } from "../member-name-cell";
import { MembersRoleCell } from "../member-role-cell";

const column = createColumnHelper<WorkspaceMemberListResponseDto>();

/** Header labels fill the row height so they line up with the cells. */
const headerLabel = (label: string) => (
  <div className="flex h-full w-full items-center">{label}</div>
);

export const useMemberColumns = () => {
  const { t } = useTranslation(defaultNs);
  const date = useDate();

  const columns = useMemo(
    () => [
      column.display({
        id: "name",
        header: () => headerLabel(t("fields.name")),
        cell: ({ row }) => <MembersNameCell member={row.original} />,
      }),
      column.display({
        id: "role",
        header: () => headerLabel(t("fields.role")),
        cell: ({ row }) => (
          <MembersRoleCell size="small" memberRole={row.original.role} />
        ),
      }),
      column.display({
        id: "joinedAt",
        header: () => headerLabel(t("fields.joinedAt")),
        cell: ({ row }) => {
          const joinedAt = new Date(row.original.joinedAt);
          const withTime = date.getFullDate({
            date: joinedAt,
            includeTime: true,
          });

          return (
            <Tooltip content={withTime}>
              <span>{date.getFullDate({ date: joinedAt })}</span>
            </Tooltip>
          );
        },
      }),
      column.display({
        id: "updatedAt",
        header: t("fields.updatedAt"),
        cell: ({ row }) =>
          row.original.updatedAt ? (
            <CreatedAtCell date={row.original.updatedAt} />
          ) : (
            <div className="text-ui-fg-muted">-</div>
          ),
      }),
    ],
    [date, t],
  );

  return columns;
};
