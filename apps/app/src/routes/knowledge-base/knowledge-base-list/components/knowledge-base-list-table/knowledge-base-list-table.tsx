import { createSelectColumn } from "@/components/table/columns";
import { _DataTable } from "@/components/table/data-table";
import {
  useBatchDeleteKnowledgeItems,
  useBatchProcessKnowledgeItems,
  useKnowledgeBases,
  useKnowledgeItems,
} from "@/hooks/api/knowledge-base";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { useDataTable } from "@/hooks/use-data-table";
import { Container, Heading, Button, usePrompt } from "@medusajs/ui";
import {
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";
import { KnowledgeItemTitleCell } from "./knowledge-item-title-cell";
import { KnowledgeItemStatusCell } from "./knowledge-item-status-cell";
import { KnowledgeItemTagListCell } from "./knowledge-item-tag-list-cell";
import { KnowledgeBaseActions } from "./knowledge-base-actions";
import { CHATBOT_CONSTANTS } from "../../../../chatbot/constants";
import type {
  KnowledgeBaseResponseDto,
  KnowledgeItemResponseDto,
} from "@repo/client";
import {
  useKnowledgeBaseTableFilters,
  useKnowledgeBaseTableQuery,
} from "./hooks";
import { useKnowledgeTags } from "../../../../../hooks/api";
import { UserLink } from "../../../../../components/common";
import { DateCell } from "../../../../../components/table/table-cells/common/date-cell";

export const KnowledgeBaseListTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Get first knowledge base for this workspace
  const {
    knowledgeBases,
    isLoading: kbsLoading,
    isError: kbsError,
  } = useKnowledgeBases();

  const firstKB = useMemo(() => {
    return knowledgeBases && knowledgeBases.length > 0
      ? knowledgeBases[0]
      : undefined;
  }, [knowledgeBases]);

  const handleCreate = useCallback(() => {
    if (firstKB?.id) {
      navigate(`${firstKB.id}/item/create`);
    }
  }, [firstKB?.id, navigate]);

  const { tags } = useKnowledgeTags(firstKB?.id || "");

  // Get query params from URL
  const { searchParams, raw } = useKnowledgeBaseTableQuery();

  // Get items from the first knowledge base with filters
  const {
    items,
    count,
    isLoading: itemsLoading,
    isError: itemsError,
    error,
  } = useKnowledgeItems(firstKB?.id || "", searchParams, {
    enabled: !!firstKB,
  });

  // Get filters configuration with items for tag extraction
  const filters = useKnowledgeBaseTableFilters({
    tags,
  });

  const columns = useColumns(firstKB);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { table } = useDataTable({
    data: items,
    columns: columns as A,
    count,
    enablePagination: true,
    pageSize: CHATBOT_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    rowSelection: { state: rowSelection, updater: setRowSelection },
  });

  const commands = useCommands(firstKB?.id ?? "");

  if (kbsError || itemsError) {
    throw error;
  }

  const isLoading = kbsLoading || itemsLoading;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("knowledgeBase.list.title")}</Heading>
        <Button
          onClick={handleCreate}
          disabled={!firstKB}
          size="small"
          variant="primary"
        >
          {t("actions.create")}
        </Button>
      </div>

      <_DataTable
        table={table}
        commands={commands}
        filters={filters}
        columns={columns}
        orderBy={[
          {
            key: "createdAt",
            label: t("knowledgeBase.list.columns.created"),
          },
          {
            key: "updatedAt",
            label: t("fields.updatedAt"),
          },
          {
            key: "status",
            label: t("knowledgeBase.list.columns.status"),
          },
          {
            key: "type",
            label: t("knowledgeBase.list.columns.type"),
          },
        ]}
        count={count}
        isLoading={isLoading}
        pageSize={CHATBOT_CONSTANTS.PAGE_SIZE}
        search
        pagination
        queryObject={raw}
        navigateTo={(row) => `${firstKB?.id}/item/${row.original.id}`}
        noRecords={{
          message: t("knowledgeBase.list.empty"),
        }}
      />
      <Outlet />
    </Container>
  );
};

// Bulk actions shown in the command bar once rows are selected.
// The backend decides which items are eligible to process and reports the rest
// as failures, so no client-side status filtering here.
const useCommands = (knowledgeBaseId: string) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const notifyBatchResult = useBatchResultToast();
  const batchDelete = useBatchDeleteKnowledgeItems(knowledgeBaseId);
  const batchProcess = useBatchProcessKnowledgeItems(knowledgeBaseId);

  return useMemo(
    () => [
      {
        label: t("knowledgeBase.batch.delete.label"),
        shortcut: "d",
        action: async (selection: Record<string, boolean>) => {
          const ids = Object.keys(selection);

          const confirmed = await prompt({
            title: t("knowledgeBase.batch.delete.title"),
            description: t("knowledgeBase.batch.delete.description", {
              count: ids.length,
            }),
            variant: "danger",
            confirmText: t("actions.delete"),
            cancelText: t("actions.cancel"),
          });

          if (!confirmed) return;

          notifyBatchResult(await batchDelete.mutateAsync(ids));
        },
      },
      {
        label: t("knowledgeBase.batch.process.label"),
        shortcut: "p",
        action: async (selection: Record<string, boolean>) => {
          notifyBatchResult(
            await batchProcess.mutateAsync(Object.keys(selection)),
          );
        },
      },
    ],
    [t, prompt, notifyBatchResult, batchDelete, batchProcess],
  );
};

const columnHelper = createColumnHelper<KnowledgeItemResponseDto>();
const useColumns = (kb?: KnowledgeBaseResponseDto) => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      createSelectColumn<KnowledgeItemResponseDto>(),
      columnHelper.accessor("title", {
        header: t("knowledgeBase.list.columns.title"),
        cell: (info) => (
          <KnowledgeItemTitleCell
            title={info.getValue()}
            type={info.row.original.type}
          />
        ),
      }),
      columnHelper.accessor("status", {
        header: t("knowledgeBase.list.columns.status"),
        cell: (info) => (
          <KnowledgeItemStatusCell
            errorMessage={info.row.original.errorMessage}
            processedAt={info.row.original.processedAt}
            status={info.getValue()}
          />
        ),
      }),
      columnHelper.accessor("tags", {
        header: t("knowledgeBase.list.columns.tags"),
        cell: (info) => <KnowledgeItemTagListCell tags={info.getValue()} />,
      }),
      columnHelper.accessor("createdAt", {
        header: t("knowledgeBase.list.columns.created"),
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      }),
      columnHelper.accessor("createdBy", {
        header: t("fields.createdBy"),
        cell: (info) => {
          const user = info.getValue();
          return user ? <UserLink {...user} /> : "-";
        },
      }),
      columnHelper.accessor("updatedAt", {
        header: t("fields.updatedAt"),
        cell: (info) => <DateCell date={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <KnowledgeBaseActions
            item={info.row.original}
            knowledgeBaseId={kb?.id}
          />
        ),
      }),
    ],
    [t, kb?.id],
  );
};
