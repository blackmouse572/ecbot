import { _DataTable, type Filter } from "@/components/table/data-table";
import { useOrders, type OrderGetResponseDto } from "@/hooks/api/orders";
import { useProductGroups } from "@/hooks/api/product-groups";
import { useDataTable } from "@/hooks/use-data-table";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ArrowUpTray, PlusMini } from "@medusajs/icons";
import { Button, Container } from "@medusajs/ui";
import { useQueryParams } from "@repo/ui/hooks";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { OrderSourceLabel } from "../components/order-source-label";
import { OrderStatusBadge } from "../components/order-status-badge";
import { OrdersPageHeader } from "../components/orders-page-header";
import {
  ORDER_CONSTANTS,
  ORDER_QUERY_PARAMS,
  ORDER_SOURCES,
  ORDER_STATUSES,
} from "../constants";
import { formatMoney, orderGroupNames, orderedAtLabel } from "../utils";
import { CustomerFilterBanner } from "./customer-filter-banner";
import { PendingOrdersBanner } from "./pending-orders-banner";

const columnHelper = createColumnHelper<OrderGetResponseDto>();

/** Frame 14: every order of the workspace, newest first. */
export const OrderList = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const raw = useQueryParams(ORDER_QUERY_PARAMS);

  const { orders, count, isLoading, isError, error } = useOrders(
    workspaceSlug,
    {
      perPage: ORDER_CONSTANTS.PAGE_SIZE,
      page: raw.page ? Number(raw.page) : 1,
      search: raw.search || undefined,
      status: raw.status || undefined,
      source: raw.source || undefined,
      productGroup: raw.productGroup || undefined,
      customer: raw.customer || undefined,
    },
  );

  const columns = useColumns();
  const filters = useFilters();

  const { table } = useDataTable({
    data: orders,
    columns,
    count,
    enablePagination: true,
    pageSize: ORDER_CONSTANTS.PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isError) {
    throw error;
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("orders.title")} - Ecbot</title>
      </Helmet>
      <Container className="divide-y p-0">
        <OrdersPageHeader
          tab="orders"
          actions={
            <div className="flex items-center gap-x-2">
              <Button size="small" variant="secondary" asChild>
                <Link to="import">
                  <ArrowUpTray />
                  {t("orders.import.open")}
                </Link>
              </Button>
              <Button size="small" asChild>
                <Link to="create">
                  <PlusMini />
                  {t("orders.create")}
                </Link>
              </Button>
            </div>
          }
        />
        {raw.customer ? (
          <CustomerFilterBanner customerId={raw.customer} />
        ) : (
          <PendingOrdersBanner />
        )}
        <_DataTable
          table={table}
          filters={filters}
          columns={columns}
          count={count}
          pageSize={ORDER_CONSTANTS.PAGE_SIZE}
          search
          pagination
          isLoading={isLoading}
          queryObject={raw}
          navigateTo={(row) => row.original.id}
          noRecords={{
            title: t("orders.list.noRecordsTitle"),
            message: t("orders.list.noRecordsMessage"),
            action: { to: "create", label: t("orders.create") },
          }}
        />
      </Container>
      <Outlet />
    </div>
  );
};

const useColumns = () => {
  const { t, i18n } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "code",
        header: () => t("orders.columns.code"),
        cell: ({ row }) => (
          <span className="code-label font-mono whitespace-nowrap">
            {row.original.code}
          </span>
        ),
      }),
      columnHelper.display({
        id: "customer",
        header: () => t("orders.columns.customer"),
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="txt-compact-small-plus truncate">
              {row.original.customerName || t("orders.noName")}
            </span>
            {row.original.customerPhone && (
              <span className="txt-compact-small text-ui-fg-subtle truncate tabular-nums">
                {row.original.customerPhone}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: "items",
        header: () => t("orders.columns.items"),
        cell: ({ row }) => {
          const [first, ...rest] = row.original.items;
          const groups = orderGroupNames(row.original);

          return (
            <div className="flex min-w-0 flex-col">
              <span className="txt-compact-small truncate">
                {first ? first.name : t("orders.noItems")}
                {first && first.quantity > 1 && (
                  <span className="text-ui-fg-muted"> ×{first.quantity}</span>
                )}
                {rest.length > 0 && (
                  <span className="text-ui-fg-muted">
                    {" "}
                    {t("orders.moreItems", { count: rest.length })}
                  </span>
                )}
              </span>
              {groups.length > 0 && (
                <span className="txt-compact-small text-ui-fg-subtle truncate">
                  {groups.join(", ")}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "total",
        header: () => (
          <span className="block text-right">{t("orders.columns.total")}</span>
        ),
        cell: ({ row }) => (
          <span className="txt-compact-small-plus ml-auto block text-right whitespace-nowrap tabular-nums">
            {formatMoney(
              row.original.total,
              row.original.currency,
              i18n.language,
            )}
          </span>
        ),
      }),
      columnHelper.display({
        id: "source",
        header: () => t("orders.columns.source"),
        cell: ({ row }) => <OrderSourceLabel source={row.original.source} />,
      }),
      columnHelper.display({
        id: "status",
        header: () => t("orders.columns.status"),
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      }),
      columnHelper.display({
        id: "orderedAt",
        header: () => t("orders.columns.orderedAt"),
        cell: ({ row }) => {
          const label = orderedAtLabel(row.original.orderedAt, i18n.language);

          return (
            <span className="txt-compact-small text-ui-fg-subtle whitespace-nowrap">
              {label.when === "earlier"
                ? label.date
                : t(`orders.date.${label.when}`, { time: label.time })}
            </span>
          );
        },
      }),
    ],
    [t, i18n.language],
  );
};

const useFilters = (): Filter[] => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const { groups } = useProductGroups(workspaceSlug, {
    perPage: ORDER_CONSTANTS.GROUP_PAGE_SIZE,
  });

  return useMemo<Filter[]>(
    () => [
      {
        key: "status",
        label: t("orders.columns.status"),
        type: "select",
        options: ORDER_STATUSES.map((status) => ({
          label: t(`orders.status.${status}`),
          value: status,
        })),
        multiple: false,
        searchable: false,
      },
      {
        key: "source",
        label: t("orders.columns.source"),
        type: "select",
        options: ORDER_SOURCES.map((source) => ({
          label: t(`orders.source.${source}`),
          value: source,
        })),
        multiple: false,
        searchable: false,
      },
      {
        key: "productGroup",
        label: t("orders.columns.group"),
        type: "select",
        options: groups.map((group) => ({
          label: group.name,
          value: group.id,
        })),
        multiple: false,
        searchable: true,
      },
    ],
    [t, groups],
  );
};
