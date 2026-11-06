import { IconShieldLock } from "@tabler/icons-react";
import { Button, Container, Heading } from "@medusajs/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";

import { _DataTable } from "@/components/table/data-table";
import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
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

  const { roles, totals, isLoading, isError, error } = useWorkspaceRoles({
    ...searchParams,
  });

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

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("app.nav.roles.header")}</Heading>
        <div className="flex items-center justify-center gap-x-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              navigate(`create`);
            }}
          >
            {t("actions.create")}
          </Button>
        </div>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        count={totals}
        pageSize={PAGE_SIZE}
        filters={roleFilters}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        navigateTo={(row) => `${row.original.id}`}
        noRecords={{
          title: t("roles.list.noRecordsTitle"),
          message: t("roles.list.noRecordsMessage"),
          action: { to: "create", label: t("roles.list.createFirst") },
          icon: <IconShieldLock />,
        }}
      />
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
