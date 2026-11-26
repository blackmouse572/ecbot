import { _DataTable } from "@/components/table/data-table";
import {
  useMarketingSends,
  type MarketingSendListResponseDto,
} from "@/hooks/api/marketing-sends";
import { useDataTable } from "@/hooks/use-data-table";
import { useDate } from "@/hooks/use-date";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Container, Heading, StatusBadge, Tabs } from "@medusajs/ui";
import { useQueryParams } from "@repo/ui/hooks";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Outlet, useSearchParams } from "react-router-dom";
import { StageTag } from "../components/stage-tag";
import {
  MARKETING_SEND_MODES,
  MARKETING_SEND_STATUS_COLOR,
  MARKETING_SENDS_PAGE_SIZE,
  MARKETING_SENDS_QUERY_PARAMS,
  TODO_STAGE,
} from "../constants";
import { rate, sendStatus } from "../utils";

const columnHelper = createColumnHelper<MarketingSendListResponseDto>();

/** Đã gửi: every send and auto-send, and how customers answered. */
export const MarketingSendList = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const raw = useQueryParams(MARKETING_SENDS_QUERY_PARAMS);
  const [, setSearchParams] = useSearchParams();

  const { sends, count, isLoading, isError, error } = useMarketingSends(
    workspaceSlug,
    {
      perPage: MARKETING_SENDS_PAGE_SIZE,
      page: raw.page ? Number(raw.page) : 1,
      search: raw.search || undefined,
      mode: raw.mode || undefined,
    },
  );

  const columns = useColumns();
  const { table } = useDataTable({
    data: sends,
    columns,
    count,
    enablePagination: true,
    pageSize: MARKETING_SENDS_PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isError) {
    throw error;
  }

  const selectTab = (tab: string) =>
    setSearchParams((params) => {
      params.delete("page");
      if (tab === "all") params.delete("mode");
      else params.set("mode", tab);
      return params;
    });

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("marketing.sends.title")} - Ecbot</title>
      </Helmet>
      <Container className="divide-y p-0">
        <div className="flex flex-col gap-y-4 px-6 py-4">
          <Heading level="h1">{t("marketing.sends.title")}</Heading>
          <Tabs value={raw.mode || "all"} onValueChange={selectTab}>
            <Tabs.List>
              {["all", ...MARKETING_SEND_MODES].map((tab) => (
                <Tabs.Trigger key={tab} value={tab}>
                  {t(`marketing.sends.tabs.${tab}`)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>
        </div>
        <_DataTable
          table={table}
          columns={columns}
          count={count}
          pageSize={MARKETING_SENDS_PAGE_SIZE}
          search
          pagination
          isLoading={isLoading}
          queryObject={raw}
          navigateTo={(row) => row.original.id}
          noRecords={{
            title: t("marketing.sends.noRecordsTitle"),
            message: t("marketing.sends.noRecordsMessage"),
            action: {
              to: `/${workspaceSlug}/${ROUTES.Marketing}`,
              label: t("marketing.sends.openOverview"),
            },
          }}
        />
      </Container>
      <Outlet />
    </div>
  );
};

const useColumns = () => {
  const { t, i18n } = useTranslation();
  const { getFullDate } = useDate();
  const number = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language],
  );
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    [i18n.language],
  );

  return useMemo(() => {
    const right = (text: string) => (
      <div className="txt-compact-small flex w-full justify-end tabular-nums">
        {text}
      </div>
    );

    return [
      columnHelper.display({
        id: "name",
        header: () => t("marketing.sends.columns.name"),
        cell: ({ row }) => (
          <span className="txt-compact-small-plus truncate">
            {row.original.name}
          </span>
        ),
      }),
      columnHelper.display({
        id: "stage",
        header: () => t("marketing.sends.columns.stage"),
        cell: ({ row }) =>
          row.original.preset && (
            <StageTag stage={TODO_STAGE[row.original.preset]} />
          ),
      }),
      columnHelper.display({
        id: "mode",
        header: () => t("marketing.sends.columns.mode"),
        cell: ({ row }) => {
          const status = sendStatus(row.original);
          return (
            <StatusBadge
              color={MARKETING_SEND_STATUS_COLOR[status]}
              className="whitespace-nowrap"
            >
              {t(`marketing.sends.status.${status}`)}
            </StatusBadge>
          );
        },
      }),
      columnHelper.display({
        id: "sent",
        header: () => right(t("marketing.sends.columns.sent")),
        cell: ({ row }) => right(number.format(row.original.stats.sent)),
      }),
      columnHelper.display({
        id: "replied",
        header: () => right(t("marketing.sends.columns.replied")),
        cell: ({ row }) => {
          const { replied, sent } = row.original.stats;
          return right(percent.format(rate(replied, sent)));
        },
      }),
      columnHelper.display({
        id: "ordered",
        header: () => right(t("marketing.sends.columns.ordered")),
        cell: ({ row }) => right(number.format(row.original.stats.ordered)),
      }),
      columnHelper.display({
        id: "lastSentAt",
        header: () => t("marketing.sends.columns.lastSentAt"),
        cell: ({ row }) => {
          const at = row.original.stats.lastSentAt;
          return (
            at && (
              <span className="txt-compact-small text-ui-fg-subtle whitespace-nowrap">
                {getFullDate({ date: new Date(at), includeTime: true })}
              </span>
            )
          );
        },
      }),
    ];
  }, [t, number, percent, getFullDate]);
};
