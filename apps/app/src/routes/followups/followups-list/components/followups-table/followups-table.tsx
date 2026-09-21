import { _DataTable } from "@/components/table/data-table";
import {
  useFollowups,
  type FollowupListResponseDto,
} from "@/hooks/api/followups";
import { useDataTable } from "@/hooks/use-data-table";
import { Container, Heading } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FOLLOWUP_CONSTANTS } from "../../../constants";
import { FollowupActions } from "./followup-actions";
import { useFollowupsTableColumns, useFollowupsTableFilters } from "./hooks";
import { useFollowupsTableQuery } from "./hooks/use-followups-table-query";

export const FollowupsTable = () => {
  const { t } = useTranslation();

  const { searchParams, raw } = useFollowupsTableQuery({
    pageSize: FOLLOWUP_CONSTANTS.PAGE_SIZE,
  });
  const filters = useFollowupsTableFilters();
  const { followups, count, isLoading, isError, error } = useFollowups({
    ...searchParams,
  });
  const columns = useColumns();

  const { table } = useDataTable({
    data: followups ?? [],
    columns: columns as A,
    count,
    enablePagination: true,
    pageSize: FOLLOWUP_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.followupId,
  });

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("followups.title")}</Heading>
      </div>
      <_DataTable
        table={table}
        filters={filters}
        columns={columns as A}
        count={count}
        pageSize={FOLLOWUP_CONSTANTS.PAGE_SIZE}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        noRecords={{
          message: t("followups.list.noRecordsMessage"),
        }}
      />
    </Container>
  );
};

const columnHelper = createColumnHelper<FollowupListResponseDto>();
const useColumns = () => {
  const base = useFollowupsTableColumns();

  const columns = useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return <FollowupActions item={row.original} />;
        },
      }),
    ],
    [base],
  );

  return columns;
};
