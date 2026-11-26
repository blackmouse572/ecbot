import { MarketingStageBadge } from "@/components/customer-marketing";
import { StackedDrawer } from "@/components/modals/stacked-drawer";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import type { MarketingOverviewTodoDto } from "@/hooks/api/marketing-overview";
import {
  useMarketingAudienceCustomers,
  type MarketingAudiencePreviewResponseDto,
} from "@/hooks/api/marketing-sends";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ConversationsCell } from "@/routes/customers/customer-list/components/customer-list-table/components/conversations-cell";
import {
  Button,
  clx,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  Text,
  useDataTable,
  type DataTableFilteringState,
  type DataTablePaginationState,
  type DataTableRowSelectionState,
} from "@medusajs/ui";
import type { CustomerGetResponseDto } from "@repo/client";
import { useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { MARKETING_SEND_CUSTOMERS_PAGE_SIZE } from "../../constants";

export const SEND_CUSTOMERS_DRAWER = "send-customers";

type Platform =
  MarketingAudiencePreviewResponseDto["channels"][number]["platform"];

type SendCustomersDrawerProps = {
  preset: MarketingOverviewTodoDto["key"];
  /** The channel chip that opened the drawer. */
  platform?: Platform;
  channels: MarketingAudiencePreviewResponseDto["channels"];
  excluded: string[];
  onExcludedChange: (ids: string[]) => void;
};

const columnHelper = createDataTableColumnHelper<CustomerGetResponseDto>();
const filterHelper = createDataTableFilterHelper<CustomerGetResponseDto>();

/**
 * Who a send reaches, channel by channel. Every customer starts ticked;
 * unticking one leaves them out of this send, and of its daily runs.
 */
export const SendCustomersDrawer: FC<SendCustomersDrawerProps> = (props) => (
  <StackedDrawer id={SEND_CUSTOMERS_DRAWER}>
    <StackedDrawer.Content>
      {/* The content unmounts on close, so each opening starts on its chip. */}
      <SendCustomersTable {...props} />
    </StackedDrawer.Content>
  </StackedDrawer>
);

const SendCustomersTable: FC<SendCustomersDrawerProps> = ({
  preset,
  platform,
  channels,
  excluded,
  onExcludedChange,
}) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  // Unticking can empty a channel out of the preview; keep it filterable.
  const [options] = useState(channels);

  const [search, setSearch] = useState("");

  const [filtering, setFiltering] = useState<DataTableFilteringState>(
    platform ? { channels: platform } : {},
  );

  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: MARKETING_SEND_CUSTOMERS_PAGE_SIZE,
  });

  // SAFETY: the channel filter's options are the preview's platforms.
  const channel = filtering.channels as Platform | undefined;

  const { customers, count, isLoading, isError } =
    useMarketingAudienceCustomers(
      workspaceSlug,
      { preset, platform: channel, search: search.trim() || undefined },
      {
        page: pagination.pageIndex + 1,
        perPage: MARKETING_SEND_CUSTOMERS_PAGE_SIZE,
      },
    );

  const unticked = useMemo(() => new Set(excluded), [excluded]);

  const rowSelection = useMemo(
    (): DataTableRowSelectionState =>
      Object.fromEntries(customers.map((c) => [c.id, !unticked.has(c.id)])),
    [customers, unticked],
  );

  const columns = useMemo(
    () => [
      columnHelper.select(),
      columnHelper.accessor("name", {
        header: t("fields.name"),
        cell: ({ getValue }) => {
          const name = getValue();

          return (
            <Text
              size="small"
              leading="compact"
              className={clx("truncate", !name && "text-ui-fg-muted")}
            >
              {name || t("customers.list.unnamed")}
            </Text>
          );
        },
      }),
      // Phone and email tell apart customers who share a name.
      columnHelper.accessor("phone", {
        header: t("customers.list.phone"),
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("email", {
        header: t("fields.email"),
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.display({
        id: "stage",
        header: t("customers.list.stage"),
        cell: ({ row }) =>
          row.original.marketing ? (
            <MarketingStageBadge
              stage={row.original.marketing.stage}
              dormant={row.original.marketing.dormant}
            />
          ) : null,
      }),
      columnHelper.display({
        id: "conversations",
        header: t("customers.list.conversations"),
        cell: ({ row }) => (
          <ConversationsCell
            conversationCount={row.original.conversationCount ?? 0}
            channels={row.original.channels ?? []}
          />
        ),
      }),
    ],
    [t],
  );

  const filters = useMemo(
    () => [
      filterHelper.accessor("channels", {
        label: t("marketing.send.customers.channel"),
        type: "radio",
        options: options.map((c) => ({
          label: channelOf(c.platform).label,
          value: c.platform,
        })),
      }),
    ],
    [t, options],
  );

  const toFirstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const table = useDataTable({
    data: customers,
    columns,
    getRowId: (row) => row.id,
    rowCount: count,
    isLoading,
    filters,
    filtering: {
      state: filtering,
      onFilteringChange: (state) => {
        setFiltering(state);
        toFirstPage();
      },
    },
    search: {
      state: search,
      onSearchChange: (value) => {
        setSearch(value);
        toFirstPage();
      },
    },
    pagination: { state: pagination, onPaginationChange: setPagination },
    rowSelection: {
      state: rowSelection,
      // Only this page's rows change; who was unticked on others stays.
      onRowSelectionChange: (state) => {
        const next = new Set(unticked);

        for (const { id } of customers) {
          if (state[id]) next.delete(id);
          else next.add(id);
        }

        onExcludedChange([...next]);
      },
    },
  });

  return (
    <>
      <StackedDrawer.Header>
        <StackedDrawer.Title>
          {t("marketing.send.customers.title")}
        </StackedDrawer.Title>
        <StackedDrawer.Description className="sr-only">
          {t("marketing.send.customers.description")}
        </StackedDrawer.Description>
      </StackedDrawer.Header>
      <StackedDrawer.Body className="flex flex-col overflow-y-auto p-0">
        {isError ? (
          <Text size="small" className="text-ui-fg-error px-6 py-4">
            {t("marketing.send.audience.error")}
          </Text>
        ) : (
          <DataTable instance={table}>
            <DataTable.Toolbar
              className="flex items-center justify-between gap-2 px-4 pt-4"
              translations={{ clearAll: t("actions.clearAll") }}
            >
              <DataTable.FilterMenu tooltip={t("filters.addFilter")} />
              <DataTable.Search
                placeholder={t("marketing.send.customers.search")}
              />
            </DataTable.Toolbar>
            <DataTable.Table
              emptyState={{
                empty: { heading: t("marketing.send.customers.empty") },
                filtered: { heading: t("marketing.send.customers.empty") },
              }}
            />
            <DataTable.Pagination
              translations={{
                of: t("general.of"),
                results: t("general.results"),
                pages: t("general.pages"),
                prev: t("general.prev"),
                next: t("general.next"),
              }}
            />
          </DataTable>
        )}
      </StackedDrawer.Body>
      <StackedDrawer.Footer>
        <div className="flex w-full items-center justify-between gap-x-2">
          <Text size="small" className="text-ui-fg-subtle">
            {excluded.length > 0
              ? t("marketing.send.customers.unticked", {
                  count: excluded.length,
                })
              : t("marketing.send.customers.allTicked")}
          </Text>
          <StackedDrawer.Close asChild>
            <Button size="small">{t("actions.done")}</Button>
          </StackedDrawer.Close>
        </div>
      </StackedDrawer.Footer>
    </>
  );
};
