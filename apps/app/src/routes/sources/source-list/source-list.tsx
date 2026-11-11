import { channelOf } from "@/components/platform-icon/channel-catalog";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { useAccounts } from "@/hooks/api/accounts";
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
  SOURCE_ACCOUNT_TYPES,
  SOURCE_CONSTANTS,
  SOURCE_QUERY_PARAMS,
  SOURCE_STATUS_COLOR,
} from "../constants";
import { SourceCloseRate } from "../components/source-close-rate";
import { closeRatePercent } from "../utils";
import { SourceRowActions } from "./source-row-actions";

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
      account: raw.account || undefined,
    },
  );

  const columns = useColumns(links);
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
          <Button size="small" asChild>
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

const useColumns = (links: TrackedLinkGetResponseDto[]) => {
  const { t, i18n } = useTranslation();
  // The bars compare sources on this page: the best rate fills its bar.
  const bestRate = Math.max(
    ...links.map((link) => closeRatePercent(link.stats) ?? 0),
    1,
  );
  const number = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language],
  );

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
              {channelOf(row.original.account.type).label}
            </span>
            <span className="txt-compact-small hidden truncate text-ui-fg-muted 2xl:inline">
              {row.original.account.name}
            </span>
          </div>
        ),
      }),
      ...(["newCustomers", "potentialCustomers", "orders"] as const).map(
        (key) =>
          columnHelper.display({
            id: key,
            header: () => (
              <div className="flex w-full justify-end">
                {t(`customerSources.columns.${key}`)}
              </div>
            ),
            cell: ({ row }) => (
              <div className="txt-compact-small flex w-full justify-end tabular-nums">
                {number.format(row.original.stats?.[key] ?? 0)}
              </div>
            ),
          }),
      ),
      columnHelper.display({
        id: "closeRate",
        header: () => t("customerSources.columns.closeRate"),
        cell: ({ row }) => (
          <SourceCloseRate stats={row.original.stats} barMax={bestRate} />
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
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <SourceRowActions link={row.original} />,
      }),
    ],
    [t, number, bestRate],
  );
};

const useFilters = (): Filter[] => {
  const { t } = useTranslation();
  // SAFETY: the API reads perPage on the account list, the generated query
  // type leaves it out (same as the conversation list).
  const { accounts } = useAccounts({ perPage: 100 } as never);

  return useMemo<Filter[]>(
    () => [
      {
        key: "account",
        label: t("customerSources.columns.channel"),
        type: "select",
        options: (accounts ?? [])
          .filter((account) => SOURCE_ACCOUNT_TYPES.includes(account.type))
          .map((account) => ({
            label: `${account.name} (${channelOf(account.type).label})`,
            value: account.id,
          })),
        multiple: false,
        searchable: true,
      },
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
    [t, accounts],
  );
};
