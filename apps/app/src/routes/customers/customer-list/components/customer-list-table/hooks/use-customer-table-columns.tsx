import type { CustomerGetResponseDto } from "@/hooks/api";
import { CreatedAtCell } from "@/components/table/table-cells/common/created-at-cell";
import { TextCell } from "@/components/table/table-cells/common/text-cell";
import { Text } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const columnHelper = createColumnHelper<CustomerGetResponseDto>();

export const useCustomerTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.accessor("name", {
        header: () => t("fields.name"),
        cell: ({ getValue }) =>
          getValue() ? (
            <TextCell text={getValue() ?? undefined} />
          ) : (
            <Text size="small" className="text-ui-fg-muted">
              {t("customers.list.unnamed")}
            </Text>
          ),
      }),
      columnHelper.accessor("phone", {
        header: () => t("customers.list.phone"),
        cell: ({ getValue }) => <TextCell text={getValue() ?? undefined} />,
      }),
      columnHelper.accessor("email", {
        header: () => t("fields.email"),
        cell: ({ getValue }) => <TextCell text={getValue() ?? undefined} />,
      }),
      columnHelper.accessor("createdAt", {
        header: () => t("customers.list.firstSeen"),
        cell: ({ getValue }) => <CreatedAtCell date={getValue()} />,
      }),
    ],
    [t],
  );
};
