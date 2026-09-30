import { _DataTable } from "@/components/table/data-table";
import { useCustomers } from "@/hooks/api";
import { useDataTable } from "@/hooks/use-data-table";
import { Container, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { CUSTOMER_LIST_PAGE_SIZE } from "../../../constants";
import { useCustomerTableColumns, useCustomerTableQuery } from "./hooks";

export const CustomerListTable = () => {
  const { t } = useTranslation();
  const { searchParams, raw } = useCustomerTableQuery();
  const { customers, count, isLoading, isError, error } =
    useCustomers(searchParams);
  const columns = useCustomerTableColumns();

  const { table } = useDataTable({
    data: customers,
    columns,
    count,
    enablePagination: true,
    pageSize: CUSTOMER_LIST_PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isError) throw error;

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("customers.title")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("customers.list.description")}
        </Text>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        count={count}
        pageSize={CUSTOMER_LIST_PAGE_SIZE}
        search
        pagination
        isLoading={isLoading}
        queryObject={raw}
        noRecords={{
          title: t("customers.list.emptyTitle"),
          message: t("customers.list.emptyMessage"),
        }}
      />
    </Container>
  );
};
