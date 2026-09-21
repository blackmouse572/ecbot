import { AccountStatusCell } from "@/routes/accounts/accounts-list/components/account-list-table/account-status-cell";
import type { RoleListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RoleTypeCell } from "../role-type-cell";

const columnHelper = createColumnHelper<RoleListResponseDto>();

export const useRoleTableColumns = () => {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: t("fields.name"),
        cell: ({ getValue }) => getValue(),
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
              {new Date(date).toLocaleDateString()}
            </span>
          );
        },
      }),
    ],
    [t],
  );

  return columns;
};
