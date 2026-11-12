import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { OrderImportSummary } from "../types";

/** The four counts of an import: new orders, taken codes, new customers, new groups. */
export const ImportSummaryCard: FC<{ summary: OrderImportSummary }> = ({
  summary,
}) => {
  const { t, i18n } = useTranslation();
  const number = (value: number) => value.toLocaleString(i18n.language);

  const stats = [
    { value: summary.orders, label: t("orders.import.summary.orders") },
    { value: summary.skipped, label: t("orders.import.summary.skipped") },
    {
      value: summary.newCustomers,
      label: t("orders.import.summary.newCustomers"),
    },
    {
      value: summary.newGroups.length,
      label: summary.newGroups.length
        ? t("orders.import.summary.newGroupsNamed", {
            names: summary.newGroups.join(", "),
          })
        : t("orders.import.summary.newGroups"),
    },
  ];

  return (
    <div className="shadow-elevation-card-rest divide-ui-border-base grid grid-cols-2 divide-x overflow-hidden rounded-lg sm:grid-cols-4">
      {stats.map(({ value, label }) => (
        <div key={label} className="flex flex-col gap-y-0.5 px-4 py-3">
          <Text size="xlarge" weight="plus" className="tabular-nums">
            {number(value)}
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {label}
          </Text>
        </div>
      ))}
    </div>
  );
};
