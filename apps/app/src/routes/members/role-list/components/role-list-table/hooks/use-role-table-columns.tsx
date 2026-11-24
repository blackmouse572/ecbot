import { AccountStatusCell } from "@/routes/accounts/accounts-list/components/account-list-table/account-status-cell";
import type { RoleListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRoleLabel } from "@/routes/members/hooks/use-role-label";
import { RoleTypeCell } from "../role-type-cell";

const columnHelper = createColumnHelper<RoleListResponseDto>();

export const useRoleTableColumns = () => {
  const { t, i18n } = useTranslation();
  const roleLabel = useRoleLabel();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: t("fields.name"),
        cell: ({ row }) => {
          const { label, description } = roleLabel(row.original);

          return (
            <span className="flex min-w-72 max-w-md flex-col py-2">
              <span>{label}</span>
              {description && (
                <span className="txt-compact-xsmall text-ui-fg-subtle whitespace-normal">
                  {description}
                </span>
              )}
            </span>
          );
        },
      }),

      columnHelper.accessor("type", {
        header: t("fields.type"),
        cell: ({ getValue }) => {
          const type = getValue();
          return <RoleTypeCell size="small" type={type} />;
        },
      }),
      columnHelper.accessor("permissions", {
        header: t("roles.fields.permissions"),
        cell: ({ getValue }) => {
          const permissions = getValue();
          return <span className="text-ui-fg-subtle">{permissions}</span>;
        },
      }),
      columnHelper.accessor("isActive", {
        header: t("fields.status"),
        cell: ({ getValue }) => {
          const isActive = getValue();
          return (
            <AccountStatusCell status={isActive ? "ACTIVE" : "INACTIVE"} />
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: t("fields.createdAt"),
        cell: ({ getValue }) => {
          const date = getValue();
          return (
            <span className="text-ui-fg-subtle">
              {new Date(date).toLocaleDateString(i18n.language)}
            </span>
          );
        },
      }),
    ],
    [t, i18n.language, roleLabel],
  );

  return columns;
};
