import { _DataTable } from "@/components/table/data-table";
import {
  useProductGroups,
  type ProductGroupGetResponseDto,
} from "@/hooks/api/product-groups";
import { useDataTable } from "@/hooks/use-data-table";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { LockClosedSolid, PlusMini } from "@medusajs/icons";
import { Button, Container, Text } from "@medusajs/ui";
import { useQueryParams } from "@repo/ui/hooks";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { OrdersPageHeader } from "../components/orders-page-header";
import { ORDER_CONSTANTS, PRODUCT_GROUP_QUERY_PARAMS } from "../constants";
import { LearnedCycleCell } from "./learned-cycle-cell";
import { ProductGroupRowActions } from "./product-group-row-actions";

const columnHelper = createColumnHelper<ProductGroupGetResponseDto>();

/** Frame 14d: the product groups and the repurchase cycle each one uses. */
export const ProductGroupList = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const raw = useQueryParams(PRODUCT_GROUP_QUERY_PARAMS);

  const { groups, count, isLoading, isError, error } = useProductGroups(
    workspaceSlug,
    {
      perPage: ORDER_CONSTANTS.PAGE_SIZE,
      page: raw.page ? Number(raw.page) : 1,
      search: raw.search || undefined,
      // The order and customer counts are opt-in; only this tab shows them.
      withStats: true,
    },
  );

  const columns = useColumns();

  const { table } = useDataTable({
    data: groups,
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
        <title>{t("orders.groups.title")} - Ecbot</title>
      </Helmet>
      <Container className="divide-y p-0">
        <OrdersPageHeader
          tab="groups"
          actions={
            <Button size="small" asChild>
              <Link to="create">
                <PlusMini />
                {t("orders.groups.create")}
              </Link>
            </Button>
          }
        />
        <_DataTable
          table={table}
          columns={columns}
          count={count}
          pageSize={ORDER_CONSTANTS.PAGE_SIZE}
          search
          pagination
          isLoading={isLoading}
          queryObject={raw}
          noRecords={{
            title: t("orders.groups.noRecordsTitle"),
            message: t("orders.groups.noRecordsMessage"),
            action: { to: "create", label: t("orders.groups.create") },
          }}
        />
        <Text
          size="small"
          className="text-ui-fg-subtle bg-ui-bg-subtle flex items-start gap-x-2 rounded-b-lg px-6 py-3"
        >
          <LockClosedSolid className="text-ui-fg-muted mt-0.5 shrink-0" />
          {t("orders.groups.howLearned")}
        </Text>
      </Container>
      <Outlet />
    </div>
  );
};

const Days = ({ days }: { days: number }) => {
  const { t } = useTranslation();

  return <>{t("orders.groups.days", { count: days })}</>;
};

const useColumns = () => {
  const { t, i18n } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: () => t("orders.groups.columns.name"),
        cell: ({ row }) => (
          <span className="txt-compact-small-plus">{row.original.name}</span>
        ),
      }),
      columnHelper.display({
        id: "repurchaseDays",
        header: () => (
          <span className="block text-right">
            {t("orders.groups.columns.inUse")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {row.original.repurchaseDays ? (
              <span className="txt-compact-medium-plus">
                <Days days={row.original.repurchaseDays} />
              </span>
            ) : (
              <span className="txt-compact-small text-ui-fg-muted">
                {t("orders.groups.none")}
              </span>
            )}
          </span>
        ),
      }),
      columnHelper.display({
        id: "defaultRepurchaseDays",
        header: () => (
          <span className="block text-right">
            {t("orders.groups.columns.yours")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="txt-compact-small block text-right tabular-nums">
            {row.original.defaultRepurchaseDays ? (
              <span className="text-ui-fg-subtle">
                <Days days={row.original.defaultRepurchaseDays} />
              </span>
            ) : (
              <Link
                to={`${row.original.id}/edit`}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              >
                {t("orders.groups.setCycle")}
              </Link>
            )}
          </span>
        ),
      }),
      columnHelper.display({
        id: "learnedRepurchaseDays",
        header: () => t("orders.groups.columns.learned"),
        cell: ({ row }) => <LearnedCycleCell group={row.original} />,
      }),
      columnHelper.display({
        id: "confirmedOrders",
        header: () => (
          <span className="block text-right">
            {t("orders.groups.columns.orders")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="txt-compact-small block text-right tabular-nums">
            {(row.original.confirmedOrders ?? 0).toLocaleString(i18n.language)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "customers",
        header: () => (
          <span className="block text-right">
            {t("orders.groups.columns.customers")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="txt-compact-small block text-right tabular-nums">
            {(row.original.customers ?? 0).toLocaleString(i18n.language)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <ProductGroupRowActions group={row.original} />,
      }),
    ],
    [t, i18n.language],
  );
};
