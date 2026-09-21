import { Button, Container, Heading, usePrompt } from "@medusajs/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLoaderData } from "react-router-dom";

import { createSelectColumn } from "@/components/table/columns";
import { _DataTable } from "@/components/table/data-table";
import { useAccounts, useBatchUnlinkAccounts } from "@/hooks/api";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { useDataTable } from "@/hooks/use-data-table";
import type { AccountListResponseDto } from "@repo/client";
import {
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";
import { accountsLoader } from "../../loader";
import { AccountActions } from "./account-actions";
import { useAccountTableColumns, useAccountTableQuery } from "./hooks";
import { useAccountTableFilters } from "./hooks/use-account-table-filters";
import { ACCOUNTS_PAGE_SIZE } from "./hooks/use-account-table-query";

export const AccountListTable = () => {
  const { t } = useTranslation();

  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof accountsLoader>
  >;

  const { searchParams, raw } = useAccountTableQuery({
    pageSize: ACCOUNTS_PAGE_SIZE,
  });
  const { accounts, count, isLoading, isError, error } = useAccounts(
    {
      ...(searchParams as A),
    },
    {
      initialData,
    },
  );
  const columns = useColumns();
  const facets = useAccountTableFilters();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { table } = useDataTable({
    data: accounts ?? [],
    columns,
    count,
    enablePagination: true,
    pageSize: ACCOUNTS_PAGE_SIZE,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    rowSelection: { state: rowSelection, updater: setRowSelection },
  });

  const commands = useCommands();

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("accounts.title")}</Heading>
        <div className="flex items-center justify-center gap-x-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="create">{t("actions.linkAccount")}</Link>
          </Button>
        </div>
      </div>
      <_DataTable
        table={table}
        commands={commands}
        columns={columns}
        count={count}
        pageSize={ACCOUNTS_PAGE_SIZE}
        filters={facets}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        navigateTo={(row) => `${row.original.slug}`}
        orderBy={[
          { key: "name", label: t("fields.name") },
          { key: "createdAt", label: t("fields.createdAt") },
          { key: "updatedAt", label: t("fields.updatedAt") },
        ]}
        noRecords={{
          message: t("accounts.list.noRecordsMessage"),
        }}
      />
      <Outlet />
    </Container>
  );
};

// Bulk actions shown in the command bar once rows are selected.
const useCommands = () => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const notifyBatchResult = useBatchResultToast();
  const batchUnlink = useBatchUnlinkAccounts();

  return useMemo(
    () => [
      {
        label: t("accounts.batch.unlink.label"),
        shortcut: "d",
        action: async (selection: Record<string, boolean>) => {
          const ids = Object.keys(selection);

          const confirmed = await prompt({
            title: t("accounts.batch.unlink.title"),
            description: t("accounts.batch.unlink.description", {
              count: ids.length,
            }),
            variant: "danger",
            confirmText: t("accounts.list.action.unlink"),
            cancelText: t("actions.cancel"),
          });

          if (!confirmed) return;

          notifyBatchResult(await batchUnlink.mutateAsync(ids));
        },
      },
    ],
    [t, prompt, notifyBatchResult, batchUnlink],
  );
};

const columnHelper = createColumnHelper<AccountListResponseDto>();
const useColumns = () => {
  const base = useAccountTableColumns();

  const columns = useMemo(
    () => [
      createSelectColumn<AccountListResponseDto>(),
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <AccountActions item={row.original} />;
        },
      }),
    ],
    [base],
  );

  return columns;
};
