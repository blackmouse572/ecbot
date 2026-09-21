import { CreatedAtCell } from "@/components/table/table-cells/common/created-at-cell";
import { defaultNs } from "@/i18n";
import type { AccountListResponseDto } from "@repo/client";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AccountNameCell } from "../account-name-cell";
import { AccountStatusCell } from "../account-status-cell";
import { AccountTypeCell } from "../account-type-cell";

const columnHelper = createColumnHelper<AccountListResponseDto>();

export const useAccountTableColumns = () => {
  const { t } = useTranslation(defaultNs);

  return useMemo(() => {
    /** Header box the leading columns share, so labels sit level with rows. */
    const headerLabel = (label: ReactNode) => (
      <div className="flex h-full w-full items-center">{label}</div>
    );

    return [
      columnHelper.display({
        id: "name",
        header: () => headerLabel(t("fields.name")),
        cell: ({ row }) => (
          <AccountNameCell type={row.original.type} name={row.original.name} />
        ),
      }),
      columnHelper.display({
        id: "status",
        header: () => headerLabel(t("fields.status")),
        cell: ({ row }) => <AccountStatusCell status={row.original.status} />,
      }),
      columnHelper.display({
        id: "type",
        header: () => headerLabel(t("fields.type")),
        cell: ({ row }) => (
          <AccountTypeCell size="2xsmall" type={row.original.type} />
        ),
      }),
      columnHelper.display({
        id: "updatedAt",
        header: t("fields.updatedAt"),
        cell: ({ row }) =>
          row.original.updatedAt ? (
            <CreatedAtCell date={row.original.updatedAt} />
          ) : (
            <div className="text-ui-fg-muted">-</div>
          ),
      }),
    ];
  }, [t]);
};
