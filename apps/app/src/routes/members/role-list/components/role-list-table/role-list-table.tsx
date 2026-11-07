import { IconShieldLock } from "@tabler/icons-react";
import { Button, Container, Heading } from "@medusajs/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";

import { _DataTable } from "@/components/table/data-table";
import { NoPermissionState } from "@/components/common/no-permission-state";
import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
import { useIsWorkspaceOwner } from "@/hooks/use-is-workspace-owner";
import { readListAccess } from "@/libs/permission-error";
import { useDataTable } from "@/hooks/use-data-table";
import type { RoleListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { RoleActions } from "./role-actions";
import {
  useRoleTableColumns,
  useRoleTableFilters,
  useRoleTableQuery,
} from "./hooks";

const PAGE_SIZE = 20;

export const RoleListTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { searchParams, raw } = useRoleTableQuery({ pageSize: PAGE_SIZE });

  // The list is owner-only in the API (WorkspaceOwnerProtected).
  const { isOwner, isPending: isCheckingOwner } = useIsWorkspaceOwner();
  const { roles, totals, isLoading, isError, error } = useWorkspaceRoles(
    { ...searchParams },
    { enabled: isOwner },
  );

  const columns = useColumns();
  const roleFilters = useRoleTableFilters();

  const { table } = useDataTable({
    data: roles,
    columns: columns as A,
    count: totals,
    enablePagination: true,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  const { denied, shouldThrow } = readListAccess({
    allowed: isOwner || isCheckingOwner,
    isError,
    error,
  });
  if (shouldThrow) {
    throw error;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("app.nav.roles.header")}</Heading>
        {isOwner && !denied && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              navigate(`create`);
            }}
          >
            {t("actions.create")}
          </Button>
        )}
      </div>
      {denied ? (
        <NoPermissionState
          icon={<IconShieldLock />}
          message={t("roles.list.noReadPermission")}
          data-testid="roles-no-access"
        />
      ) : (
        <_DataTable
          table={table}
          columns={columns}
          count={totals}
          pageSize={PAGE_SIZE}
          filters={roleFilters}
          search
          pagination
          isLoading={isCheckingOwner || isLoading}
          queryObject={raw}
          navigateTo={(row) => `${row.original.id}`}
          noRecords={{
            title: t("roles.list.noRecordsTitle"),
            message: t("roles.list.noRecordsMessage"),
            action: { to: "create", label: t("roles.list.createFirst") },
            icon: <IconShieldLock />,
          }}
        />
      )}
      <Outlet />
    </Container>
  );
};

const columnHelper = createColumnHelper<RoleListResponseDto>();
const useColumns = () => {
  const base = useRoleTableColumns();

  const columns = useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <RoleActions item={row.original} />;
        },
      }),
    ],
    [base],
  );

  return columns;
};
