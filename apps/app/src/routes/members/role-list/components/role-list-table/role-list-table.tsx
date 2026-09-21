import { Button, Container, Heading, toast, usePrompt } from "@medusajs/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { _DataTable } from "@/components/table/data-table";
import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
import { useDataTable } from "@/hooks/use-data-table";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Pencil, Trash } from "@medusajs/icons";
import type { RoleListResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { createColumnHelper } from "@tanstack/react-table";
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
          message: t("accounts.list.noRecordsMessage"),
        }}
      />
      <Outlet />
    </Container>
  );
};

const RoleActions = ({ item }: { item: RoleListResponseDto }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const navigate = useNavigate();
  const dialog = usePrompt();
  const location = useLocation();

  const deleteRoleHandler = async () => {
    const confirmed = await dialog({
      title: "Delete Role",
      description:
        "Are you sure you want to delete this role? This action cannot be undone.",
    });

    if (!confirmed) return;

    // TODO: Implement delete role functionality
    toast.promise(Promise.resolve(), {
      success: "Role deleted successfully",
      error: "Failed to delete role",
      loading: "Deleting role...",
    });
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Pencil />,
              label: t("actions.edit"),
              onClick: () =>
                navigate(
                  `/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.WorkspaceRoles}/${item.id}/edit`,
                  {
                    state: { prev: location.pathname },
                  },
                ),
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: () => deleteRoleHandler(),
            },
          ],
        },
      ]}
    />
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
