import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { _DataTable, type Filter } from "@/components/table/data-table";
import {
  useTrackedLinks,
  type TrackedLinkGetResponseDto,
} from "@/hooks/api/tracked-links";
import { useDataTable } from "@/hooks/use-data-table";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { PlusMini } from "@medusajs/icons";
import { Button, Container, Heading, StatusBadge, Text } from "@medusajs/ui";
import { useQueryParams } from "@repo/ui/hooks";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import {
  SOURCE_CONSTANTS,
  SOURCE_QUERY_PARAMS,
  SOURCE_STATUS_COLOR,
} from "../constants";

const columnHelper = createColumnHelper<TrackedLinkGetResponseDto>();

export const SourceList = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const raw = useQueryParams(SOURCE_QUERY_PARAMS);

  const { links, count, isLoading, isError, error } = useTrackedLinks(
    workspaceSlug,
    {
      perPage: SOURCE_CONSTANTS.PAGE_SIZE,
      page: raw.page ? Number(raw.page) : 1,
      search: raw.search || undefined,
      status: raw.status || undefined,
    },
  );

  const columns = useColumns();
  const filters = useFilters();

  const { table } = useDataTable({
    data: links,
    columns,
    count,
    enablePagination: true,
    pageSize: SOURCE_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isError) {
    throw error;
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("customerSources.title")} - Ecbot</title>
      </Helmet>
      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <Heading level="h1">{t("customerSources.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("customerSources.description")}
            </Text>
          </div>
          <Button size="small" variant="secondary" asChild>
            <Link to="create">
              <PlusMini />
              {t("customerSources.create")}
            </Link>
          </Button>
        </div>
        <_DataTable
          table={table}
          filters={filters}
          columns={columns}
          count={count}
          pageSize={SOURCE_CONSTANTS.PAGE_SIZE}
          search
          pagination
          isLoading={isLoading}
          queryObject={raw}
          navigateTo={(row) => row.original.id}
          noRecords={{
            title: t("customerSources.list.noRecordsTitle"),
            message: t("customerSources.list.noRecordsMessage"),
            action: { to: "create", label: t("customerSources.create") },
          }}
        />
      </Container>
      <Outlet />
    </div>
  );
};

const useColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: () => t("customerSources.columns.source"),
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="txt-compact-small-plus truncate">
              {row.original.name}
            </span>
            <span className="txt-compact-small truncate text-ui-fg-subtle">
              {t(`customerSources.kind.${row.original.kind}`)}
            </span>
          </div>
        ),
      }),
      columnHelper.display({
        id: "channel",
        header: () => t("customerSources.columns.channel"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-x-2">
            <PlatformIcon type={row.original.account.type} aria-hidden />
            <span className="txt-compact-small truncate">
              {row.original.account.name}
            </span>
          </div>
        ),
      }),
      columnHelper.display({
        id: "code",
        header: () => t("customerSources.columns.link"),
        cell: ({ row }) => (
          <span className="code-label truncate font-mono text-ui-fg-subtle">
            {row.original.code}
          </span>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: () => t("customerSources.columns.status"),
        cell: ({ row }) => (
          <StatusBadge
            color={SOURCE_STATUS_COLOR[row.original.status]}
            className="whitespace-nowrap"
          >
            {t(`customerSources.status.${row.original.status}`)}
          </StatusBadge>
        ),
      }),
    ],
    [t],
  );
};

const useFilters = (): Filter[] => {
  const { t } = useTranslation();

  return useMemo<Filter[]>(
    () => [
      {
        key: "status",
        label: t("customerSources.columns.status"),
        type: "select",
        options: [
          { label: t("customerSources.status.ACTIVE"), value: "ACTIVE" },
          { label: t("customerSources.status.STOPPED"), value: "STOPPED" },
        ],
        multiple: false,
        searchable: false,
      },
    ],
    [t],
  );
};
