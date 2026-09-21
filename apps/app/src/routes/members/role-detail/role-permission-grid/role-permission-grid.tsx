import { DataTable } from "@repo/ui/table";
import { TextCell } from "@/components/table/table-cells/common/text-cell";
import { Container, Heading } from "@medusajs/ui";
import { type RoleGetResponseDto } from "@repo/client";
import type { CellContext, ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { useMemo } from "react";

type RolePermissionGridProps = {
  item: Pick<RoleGetResponseDto, "permissions">;
};

type PermissionRow = {
  subject: string;
  manage?: boolean;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export function RolePermissionGrid({ item }: RolePermissionGridProps) {
  const { permissions } = item;
  const columns = useColumns();

  // Transform permissions data into table rows
  const tableData = useMemo<PermissionRow[]>(() => {
    const permissionMap = new Map<string, string[]>();

    // Group permissions by subject
    permissions.forEach((permission) => {
      permissionMap.set(permission.subject, permission.action);
    });

    // Convert to table rows
    return Array.from(permissionMap.entries()).map(([subject, actions]) => ({
      subject,
      manage: actions.includes("manage"),
      read: actions.includes("read"),
      create: actions.includes("create"),
      update: actions.includes("update"),
      delete: actions.includes("delete"),
    }));
  }, [permissions]);

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{t("roles.fields.permissions")}</Heading>
      </div>
      <div className="pb-6 ">
        <DataTable
          data={tableData}
          layout="auto"
          getRowId={(row) => row.subject}
          columns={columns}
          enableSearch={false}
          enablePagination={false}
        />
      </div>
    </Container>
  );
}

function useColumns() {
  return useMemo<ColumnDef<PermissionRow>[]>(
    () => [
      {
        accessorFn: (row) => row.subject,
        accessorKey: "subject",
        enableSorting: false,
        header: "Subject",
        cell: (row) => {
          return (
            <div className="min-h-12 flex items-center">
              <TextCell text={row.getValue() as string} />
            </div>
          );
        },
      },
      {
        accessorFn: (row) => row.manage,
        accessorKey: "manage",
        enableSorting: false,
        header: t("roles.actions.manage"),
        cell: (row) => {
          return (
            <div className="min-h-12 flex items-center">
              {(row.getValue() as boolean) ? (
                <TextCell text="✔️" />
              ) : (
                <TextCell text="❌" />
              )}
            </div>
          );
        },
      },
      {
        accessorFn: (row) => row.read,
        accessorKey: "read",
        enableSorting: false,
        header: t("roles.actions.read"),
        cell: (row) => <PermissionCell row={row as A} />,
      },
      {
        accessorFn: (row) => row.create,
        accessorKey: "create",
        enableSorting: false,
        header: t("roles.actions.create"),
        cell: (row) => <PermissionCell row={row as A} />,
      },
      {
        accessorFn: (row) => row.update,
        accessorKey: "update",
        enableSorting: false,
        header: t("roles.actions.update"),

        cell: (row) => <PermissionCell row={row as A} />,
      },
      {
        accessorFn: (row) => row.delete,
        accessorKey: "delete",
        enableSorting: false,
        header: t("roles.actions.delete"),
        cell: (row) => <PermissionCell row={row as A} />,
      },
    ],
    [],
  );
}

function PermissionCell({ row }: { row: CellContext<PermissionRow, boolean> }) {
  const isManaged = row.row.original.manage;

  if (isManaged) {
    return <div className="min-h-12 items-center flex ">-</div>;
  }

  return (
    <div className="min-h-12 flex items-center">
      {row.getValue() ? <TextCell text="✔️" /> : <TextCell text="❌" />}
    </div>
  );
}
