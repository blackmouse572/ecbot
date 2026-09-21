import { _DataTable } from "@/components/table/data-table";
import { useWorkspaceMembers } from "@/hooks/api";
import { useDataTable } from "@/hooks/use-data-table";
import { defaultNs } from "@/i18n";
import { Button, Container, Heading } from "@medusajs/ui";
import type { WorkspaceMemberListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { MemberInviteDialog } from "../member-invite-dialog";
import {
  MEMBERS_PAGE_SIZE,
  useMemberColumns,
  useMemberTableFilters,
  useMemberTableQuery,
} from "./hooks";
import { MemberRowActions } from "./member-row-actions";

const column = createColumnHelper<WorkspaceMemberListResponseDto>();

/** Member columns with the row action menu pinned after them. */
const useColumnsWithActions = () => {
  const memberColumns = useMemberColumns();

  return useMemo(
    () => [
      ...memberColumns,
      column.display({
        id: "actions",
        cell: ({ row }) => <MemberRowActions member={row.original} />,
      }),
    ],
    [memberColumns],
  );
};

export const MemberListTable = () => {
  const { t } = useTranslation(defaultNs);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const { raw: urlParams, searchParams } = useMemberTableQuery();
  const {
    members: rows,
    count: total,
    isLoading,
    isError,
    error,
  } = useWorkspaceMembers(searchParams);

  const memberColumns = useColumnsWithActions();
  const tableFilters = useMemberTableFilters();
  const dataTable = useDataTable({
    data: rows,
    columns: memberColumns,
    count: total,
    enablePagination: true,
    pageSize: MEMBERS_PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isError) throw error;

  const title = t("app.nav.members.header");

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{title}</Heading>
        <div className="flex items-center justify-center gap-x-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setInviteOpen(true)}
          >
            {t("members.inviteMember.action")}
          </Button>
        </div>
      </div>
      <_DataTable
        table={dataTable.table}
        columns={memberColumns}
        count={total}
        pageSize={MEMBERS_PAGE_SIZE}
        filters={tableFilters}
        search
        pagination
        isLoading={isLoading}
        queryObject={urlParams}
        navigateTo={(row) => `${row.original.id}`}
        noRecords={{ message: t("accounts.list.noRecordsMessage") }}
      />
      <MemberInviteDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
      <Outlet />
    </Container>
  );
};
