import {
  CUSTOMER_PERMISSIONS,
  CUSTOMER_STAGES,
} from "@/components/customer-marketing";
import type { Filter } from "@/components/table/data-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/** Giai đoạn, Nhận ưu đãi and Lâu không nhắn facets above the customer table. */
export const useCustomerTableFilters = (): Filter[] => {
  const { t } = useTranslation();

  return useMemo<Filter[]>(
    () => [
      {
        key: "stage",
        label: t("customers.list.stage"),
        type: "select",
        multiple: true,
        options: CUSTOMER_STAGES.map((value) => ({
          value,
          label: t(`customerMarketing.stage.${value}`),
        })),
      },
      {
        key: "permission",
        label: t("customers.list.permission"),
        type: "select",
        multiple: true,
        options: CUSTOMER_PERMISSIONS.map((value) => ({
          value,
          label: t(`customerMarketing.permission.${value}`),
        })),
      },
      {
        key: "dormant",
        label: t("customers.list.dormant"),
        type: "select",
        options: ["true", "false"].map((value) => ({
          value,
          label: t(`customers.list.dormantOptions.${value}`),
        })),
      },
    ],
    [t],
  );
};
