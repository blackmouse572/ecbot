import { _DataTable } from "@/components/table/data-table";
import { useRevokeSession, useSessions } from "@/hooks/api";
import { useDataTable } from "@/hooks/use-data-table";
import { canRevoke } from "@/modules/sessions";
import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import type { SessionListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSessionTableColumns } from "./use-session-table-columns";
import { useSessionTableFilters } from "./use-session-table-filters";
import { useSessionsTableQuery } from "./use-session-table-query";

const PAGE_SIZE = 20;

export const SessionsTable = () => {
  const { t } = useTranslation();
  const { searchParams, raw } = useSessionsTableQuery({ pageSize: PAGE_SIZE });

  const { sessions, count, isLoading, isError, error } =
    useSessions(searchParams);

  const columns = useColumns();
  const filters = useSessionTableFilters();

  const { table } = useDataTable({
    data: sessions,
    columns,
    count,
    enablePagination: true,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col px-6 py-4">
        <Heading level="h2">{t("sessions.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("sessions.subtitle")}
        </Text>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        count={count}
        pageSize={PAGE_SIZE}
        filters={filters}
        pagination
        isLoading={isLoading}
        queryObject={raw}
        noRecords={{
          message: t("sessions.table.empty"),
        }}
      />
    </Container>
  );
};

const RevokeButton = ({ item }: { item: SessionListResponseDto }) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const revokeSession = useRevokeSession();

  const revokeHandler = async () => {
    const confirmed = await prompt({
      title: t("sessions.revoke.confirm.title"),
      description: t("sessions.revoke.confirm.description"),
      confirmText: t("sessions.revoke.confirm.confirm"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await revokeSession.mutateAsync(item.id);
      toast.success(t("sessions.toast.revoked"));
    } catch (e) {
      // The API refuses to revoke the session backing this request — surface
      // its localized message instead of a generic failure.
      toast.error(
        e instanceof Error ? e.message : t("sessions.toast.revokeFailed"),
      );
    }
  };

  return (
    <Button
      size="small"
      variant="transparent"
      className="text-ui-fg-error"
      isLoading={revokeSession.isPending}
      onClick={revokeHandler}
    >
      {t("sessions.revoke.label")}
    </Button>
  );
};

const columnHelper = createColumnHelper<SessionListResponseDto>();
const useColumns = () => {
  const base = useSessionTableColumns();

  return useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) =>
          canRevoke(row.original.status) ? (
            <div className="flex justify-end">
              <RevokeButton item={row.original} />
            </div>
          ) : null,
      }),
    ],
    [base],
  );
};
