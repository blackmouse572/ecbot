import { createSelectColumn } from "@/components/table/columns";
import { DateCell } from "@/components/table/table-cells/common/date-cell";
import { _DataTable } from "@/components/table/data-table";
import {
  useBatchSetMarketingSendsActive,
  useMarketingSends,
  type MarketingSendListResponseDto,
} from "@/hooks/api/marketing-sends";
import { useBatchResultToast } from "@/hooks/use-batch-result-toast";
import { useDataTable } from "@/hooks/use-data-table";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Container, Heading, StatusBadge, Tabs, usePrompt } from "@medusajs/ui";
import { useQueryParams } from "@repo/ui/hooks";
import {
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { table } = useDataTable({
    data: sends,
    columns,
    count,
    enablePagination: true,
    pageSize: MARKETING_SENDS_PAGE_SIZE,
    getRowId: (row) => row.id,
    // Only an auto-send can be turned off or back on.
    enableRowSelection: (row) => row.original.mode === "AUTO",
    rowSelection: { state: rowSelection, updater: setRowSelection },
  });
  // Offer Tắt only when a ticked send is on, Bật lại only when one is off.
  const ticked = sends.filter((send) => rowSelection[send.id]);
  const commands = useCommands(workspaceSlug, setRowSelection, {
    turnOff: ticked.some((send) => send.active),
    turnOn: ticked.some((send) => !send.active),
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
          commands={commands}
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

// Bulk actions shown in the command bar once auto-sends are ticked.
const useCommands = (
  workspace: string,
  setRowSelection: (selection: RowSelectionState) => void,
  offer: { turnOff: boolean; turnOn: boolean },
) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const notifyBatchResult = useBatchResultToast();
  const { mutateAsync } = useBatchSetMarketingSendsActive(workspace);

  return useMemo(() => {
    const setActive = async (ids: string[], active: boolean) => {
      notifyBatchResult(await mutateAsync({ ids, active }));
      setRowSelection({});
    };

    const turnOff = {
      label: t("marketing.sends.batch.turnOff.label"),
      shortcut: "s",
      action: async (selection: Record<string, boolean>) => {
        const ids = Object.keys(selection);
        const confirmed = await prompt({
          title: t("marketing.sends.batch.turnOff.title", {
            count: ids.length,
          }),
          description: t("marketing.sends.batch.turnOff.description"),
          confirmText: t("marketing.sends.batch.turnOff.label"),
          cancelText: t("actions.cancel"),
        });

        if (confirmed) await setActive(ids, false);
      },
    };
    const turnOn = {
      label: t("marketing.sends.batch.turnOn.label"),
      shortcut: "a",
      action: (selection: Record<string, boolean>) =>
        setActive(Object.keys(selection), true),
    };

    return [
      ...(offer.turnOff ? [turnOff] : []),
      ...(offer.turnOn ? [turnOn] : []),
    ];
  }, [
    t,
    prompt,
    notifyBatchResult,
    mutateAsync,
    setRowSelection,
    offer.turnOff,
    offer.turnOn,
  ]);
};

const useColumns = () => {
  const { t, i18n } = useTranslation();
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
      createSelectColumn<MarketingSendListResponseDto>(),
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
        cell: ({ row }) => <DateCell date={row.original.stats.lastSentAt} />,
      }),
    ];
  }, [t, number, percent]);
};
