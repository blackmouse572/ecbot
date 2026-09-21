import { createSelectColumn } from "@/components/table/columns";
import { _DataTable } from "@/components/table/data-table";
import { useBatchDeleteSkills, useListSkills } from "@/hooks/api/skills";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { useDataTable } from "@/hooks/use-data-table";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { SKILL_CONSTANTS } from "@/routes/skills/constants";
import { PlusMini } from "@medusajs/icons";
import { Button, Container, Heading, usePrompt } from "@medusajs/ui";
import type { SkillListResponseDto } from "@repo/client";
import {
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import {
  useSkillTableColumns,
  useSkillTableFilters,
  useSkillTableQuery,
} from "./hooks";
import { SkillActions } from "./skill-actions";

export const SkillsListTable = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const { searchParams, raw } = useSkillTableQuery({
    pageSize: SKILL_CONSTANTS.PAGE_SIZE,
  });
  const filters = useSkillTableFilters();

  const { skills, count, isLoading, isError, error } = useListSkills(
    workspaceSlug,
    { ...searchParams },
  );

  const columns = useColumns();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { table } = useDataTable({
    data: skills ?? [],
    columns: columns as A,
    count,
    enablePagination: true,
    pageSize: SKILL_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.id as string,
    enableRowSelection: true,
    rowSelection: { state: rowSelection, updater: setRowSelection },
  });

  const commands = useCommands(workspaceSlug);

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("skills.title")}</Heading>
        <div className="flex items-center gap-x-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="browse">{t("skills.actions.browse")}</Link>
          </Button>
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
        filters={filters}
        columns={columns as A}
        count={count}
        pageSize={SKILL_CONSTANTS.PAGE_SIZE}
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
          message: t("skills.list.noRecordsMessage"),
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
  const { batchDeleteSkills } = useBatchDeleteSkills(workspaceSlug);

  return useMemo(
    () => [
      {
        label: t("skills.batch.delete.label"),
        shortcut: "d",
        action: async (selection: Record<string, boolean>) => {
          const ids = Object.keys(selection);

          const confirmed = await prompt({
            title: t("skills.batch.delete.title"),
            description: t("skills.batch.delete.description", {
              count: ids.length,
            }),
            variant: "danger",
            confirmText: t("actions.delete"),
            cancelText: t("actions.cancel"),
          });

          if (!confirmed) return;

          notifyBatchResult(await batchDeleteSkills(ids));
        },
      },
    ],
    [t, prompt, notifyBatchResult, batchDeleteSkills],
  );
};

const columnHelper = createColumnHelper<SkillListResponseDto>();
const useColumns = () => {
  const base = useSkillTableColumns();

  return useMemo(
    () => [
      createSelectColumn<SkillListResponseDto>(),
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <SkillActions item={row.original} />,
      }),
    ],
    [base],
  );
};
