import { createSelectColumn } from "@/components/table/columns";
import { _DataTable } from "@/components/table/data-table";
import {
  useBatchDeleteChatbots,
  useBatchToggleChatbotActive,
  useChatbots,
  type ChatbotListResponseDto,
} from "@/hooks/api";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { useDataTable } from "@/hooks/use-data-table";
import { PlusMini } from "@medusajs/icons";
import { Button, Container, Heading, usePrompt } from "@medusajs/ui";
import {
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLoaderData } from "react-router-dom";
import { CHATBOT_CONSTANTS } from "../../../constants";
import { chatbotLoader } from "../../loader";
import { ChatbotActions } from "./chatbot-actions";
import {
  useChatbotTableColumns,
  useChatbotTableFilters,
  useChatbotTableQuery,
} from "./hooks";

export const ChatbotListTable = () => {
  const { t } = useTranslation();

  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof chatbotLoader>
  >;

  const { searchParams, raw } = useChatbotTableQuery();
  const facets = useChatbotTableFilters();
  const { chatbots, count, isLoading, isError, error } = useChatbots(
    { ...searchParams },
    { initialData },
  );
  const columns = useColumns();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { table } = useDataTable({
    data: chatbots ?? [],
    columns: columns as A,
    count,
    enablePagination: true,
    pageSize: CHATBOT_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.id as string,
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
        <Heading level="h2">{t("chatbot.title")}</Heading>
        <div className="flex items-center justify-center gap-x-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="create">
              <PlusMini />
              {t("actions.create")}
            </Link>
          </Button>
        </div>
      </div>
      <_DataTable
        table={table}
        commands={commands}
        filters={facets}
        columns={columns as A}
        count={count}
        pageSize={CHATBOT_CONSTANTS.PAGE_SIZE}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        navigateTo={(row) => `${row.original.id}`}
        orderBy={[
          { key: "name", label: t("fields.name") },
          { key: "type", label: t("fields.type") },
          { key: "status", label: t("fields.status") },
          { key: "updatedAt", label: t("fields.updatedAt") },
        ]}
        noRecords={{
          message: t("chatbot.list.noRecordsMessage"),
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
  const batchDelete = useBatchDeleteChatbots();
  const batchToggleActive = useBatchToggleChatbotActive();

  return useMemo(
    () => [
      {
        label: t("chatbot.batch.delete.label"),
        shortcut: "d",
        action: async (selection: Record<string, boolean>) => {
          const ids = Object.keys(selection);

          const confirmed = await prompt({
            title: t("chatbot.batch.delete.title"),
            description: t("chatbot.batch.delete.description", {
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
        label: t("chatbot.batch.activate.label"),
        shortcut: "a",
        action: async (selection: Record<string, boolean>) => {
          notifyBatchResult(
            await batchToggleActive.mutateAsync({
              ids: Object.keys(selection),
              active: true,
            }),
          );
        },
      },
      {
        label: t("chatbot.batch.deactivate.label"),
        shortcut: "s",
        action: async (selection: Record<string, boolean>) => {
          notifyBatchResult(
            await batchToggleActive.mutateAsync({
              ids: Object.keys(selection),
              active: false,
            }),
          );
        },
      },
    ],
    [t, prompt, notifyBatchResult, batchDelete, batchToggleActive],
  );
};

const columnHelper = createColumnHelper<ChatbotListResponseDto>();
const useColumns = () => {
  const base = useChatbotTableColumns();

  const columns = useMemo(
    () => [
      createSelectColumn<ChatbotListResponseDto>(),
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <ChatbotActions item={row.original} />;
        },
      }),
    ],
    [base],
  );

  return columns;
};
