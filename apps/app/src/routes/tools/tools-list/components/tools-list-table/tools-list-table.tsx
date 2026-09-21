import { createSelectColumn } from "@/components/table/columns";
import { _DataTable } from "@/components/table/data-table";
import {
  useBatchDeleteTools,
  useListTools,
  type ToolListResponseDto,
} from "@/hooks/api/tools";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { useDataTable } from "@/hooks/use-data-table";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { PlusMini } from "@medusajs/icons";
import { Button, Container, Heading, usePrompt } from "@medusajs/ui";
import {
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";
import { TOOL_CONSTANTS } from "../../../constants";
import { ToolActions } from "./tool-actions";
import {
  useToolTableColumns,
  useToolTableFilters,
  useToolTableQuery,
} from "./hooks";

export const ToolsListTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();

  const { searchParams, raw } = useToolTableQuery({
    pageSize: TOOL_CONSTANTS.PAGE_SIZE,
  });
  const filters = useToolTableFilters();

  const { tools, count, isLoading, isError, error } = useListTools(
    workspaceSlug,
    searchParams,
  );

  const columns = useColumns();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { table } = useDataTable({
    data: tools ?? [],
    columns: columns as A,
    count,
    enablePagination: true,
    pageSize: TOOL_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    rowSelection: { state: rowSelection, updater: setRowSelection },
  });

  const commands = useCommands(workspaceSlug);

  if (isError) {
    throw error;
  }

  const handleNewTool = () => navigate(`/${workspaceSlug}/tools/new`);
  const handleMarketplace = () =>
    navigate(`/${workspaceSlug}/tools/marketplace`);

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("tools.title")}</Heading>
        </div>
        <div className="flex items-center gap-x-2">
          <Button size="small" variant="secondary" onClick={handleMarketplace}>
            {t("tools.actions.browseMarketplace")}
          </Button>
          <Button size="small" variant="primary" onClick={handleNewTool}>
            <PlusMini />
            {t("actions.create")}
          </Button>
        </div>
      </div>
      <_DataTable
        table={table}
        commands={commands}
        filters={filters}
        columns={columns as A}
        count={count}
        pageSize={TOOL_CONSTANTS.PAGE_SIZE}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        navigateTo={(row) => `${row.original.id}`}
        orderBy={[
          { key: "name", label: t("fields.name") },
          { key: "createdAt", label: t("fields.createdAt") },
        ]}
        noRecords={{
          message: t("tools.list.noRecordsMessage"),
        }}
      />
      <Outlet />
    </Container>
  );
};

// Bulk actions shown in the command bar once rows are selected.
const useCommands = (workspaceSlug: string) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const notifyBatchResult = useBatchResultToast();
  const { batchDeleteTools } = useBatchDeleteTools(workspaceSlug);

  return useMemo(
    () => [
      {
        label: t("tools.batch.delete.label"),
        shortcut: "d",
        action: async (selection: Record<string, boolean>) => {
          const ids = Object.keys(selection);

          const confirmed = await prompt({
            title: t("tools.batch.delete.title"),
            description: t("tools.batch.delete.description", {
              count: ids.length,
            }),
            variant: "danger",
            confirmText: t("actions.delete"),
            cancelText: t("actions.cancel"),
          });

          if (!confirmed) return;

          notifyBatchResult(await batchDeleteTools(ids));
        },
      },
    ],
    [t, prompt, notifyBatchResult, batchDeleteTools],
  );
};

const columnHelper = createColumnHelper<ToolListResponseDto>();

const useColumns = () => {
  const base = useToolTableColumns();

  return useMemo(
    () => [
      createSelectColumn<ToolListResponseDto>(),
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <ToolActions item={row.original} />,
      }),
    ],
    [base],
  );
};
