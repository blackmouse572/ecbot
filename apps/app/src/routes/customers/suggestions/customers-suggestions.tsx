import { _DataTable } from "@/components/table/data-table";
import {
  useCustomerMergeSuggestionList,
  type CustomerMergeSuggestionGetResponseDto,
  type CustomerMergeSuggestionStatus,
} from "@/hooks/api/customer-merge-suggestions";
import { useDataTable } from "@/hooks/use-data-table";
import { Button, Container, Heading, Select, Text } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MergeSuggestionDialog } from "./merge-suggestion-dialog";

const STATUSES: CustomerMergeSuggestionStatus[] = [
  "PENDING",
  "DISMISSED",
  "MERGED",
];

const PAGE_SIZE = 50;

export const CustomersSuggestions = () => {
  const { t } = useTranslation();
  const [status, setStatus] =
    useState<CustomerMergeSuggestionStatus>("PENDING");
  const [reviewing, setReviewing] =
    useState<CustomerMergeSuggestionGetResponseDto | null>(null);

  const { suggestions, totalData, isLoading } = useCustomerMergeSuggestionList({
    status,
    page: 1,
    perPage: PAGE_SIZE,
  });

  const columns = useColumns({ onReview: setReviewing });

  const { table } = useDataTable({
    data: suggestions,
    columns,
    count: totalData,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("customers.suggestions.title")}</Heading>
            <Text className="text-ui-fg-subtle">
              {t("customers.suggestions.description")}
            </Text>
          </div>
          <Select
            size="small"
            value={status}
            onValueChange={(value) =>
              setStatus(value as CustomerMergeSuggestionStatus)
            }
          >
            <Select.Trigger className="w-auto min-w-[140px]">
              <Select.Value
                placeholder={t("customers.suggestions.filter.status")}
              />
            </Select.Trigger>
            <Select.Content>
              {STATUSES.map((opt) => (
                <Select.Item key={opt} value={opt}>
                  {t(`customers.suggestions.status.${opt}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <_DataTable
          table={table}
          columns={columns}
          count={totalData}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          noRecords={{
            message: t("customers.suggestions.empty"),
          }}
        />
      </Container>

      <MergeSuggestionDialog
        suggestion={reviewing}
        onClose={() => setReviewing(null)}
      />
    </div>
  );
};

const columnHelper =
  createColumnHelper<CustomerMergeSuggestionGetResponseDto>();

const useColumns = ({
  onReview,
}: {
  onReview: (s: CustomerMergeSuggestionGetResponseDto) => void;
}) => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "customerA",
        header: () => t("customers.suggestions.table.customerA"),
        cell: ({ row }) => (
          <CustomerCell
            name={row.original.customerA?.name}
            id={row.original.customerA?.id}
          />
        ),
      }),
      columnHelper.display({
        id: "customerB",
        header: () => t("customers.suggestions.table.customerB"),
        cell: ({ row }) => (
          <CustomerCell
            name={row.original.customerB?.name}
            id={row.original.customerB?.id}
          />
        ),
      }),
      columnHelper.display({
        id: "matchField",
        header: () => t("customers.suggestions.table.matchField"),
        cell: ({ row }) => row.original.matchField,
      }),
      columnHelper.display({
        id: "matchValue",
        header: () => t("customers.suggestions.table.matchValue"),
        cell: ({ row }) => (
          <span className="block max-w-xs truncate">
            {row.original.matchValue}
          </span>
        ),
      }),
      columnHelper.display({
        id: "createdAt",
        header: () => t("customers.suggestions.table.createdAt"),
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => onReview(row.original)}
              disabled={row.original.status !== "PENDING"}
            >
              {t("customers.suggestions.actions.review")}
            </Button>
          </div>
        ),
      }),
    ],
    [onReview, t],
  );
};

function CustomerCell({ name, id }: { name?: string | null; id?: string }) {
  return (
    <div className="flex flex-col">
      <Text size="small" weight="plus" leading="compact">
        {name?.trim() || (id ? `#${id.slice(0, 8)}` : "—")}
      </Text>
      {id && (
        <Text size="xsmall" className="text-ui-fg-muted truncate">
          {id}
        </Text>
      )}
    </div>
  );
}
