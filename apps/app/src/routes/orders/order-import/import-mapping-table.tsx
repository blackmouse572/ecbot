import { ArrowRightMini } from "@medusajs/icons";
import { Select, Text, clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ORDER_IMPORT_FIELDS } from "../constants";
import type { OrderImportField, OrderImportMapping } from "../types";

const SKIP = "skip";

/**
 * Frame 14e's table: each file column, the order detail it fills, and its
 * value on the first row. A detail fills one column, so picking it for a
 * column takes it off the column that had it.
 */
export const ImportMappingTable: FC<{
  headers: string[];
  sample: string[];
  mapping: OrderImportMapping;
  onChange: (mapping: OrderImportMapping) => void;
}> = ({ headers, sample, mapping, onChange }) => {
  const { t } = useTranslation();

  const pick = (column: number, value: string) => {
    // SAFETY: the select lists only SKIP and ORDER_IMPORT_FIELDS.
    const field = value === SKIP ? null : (value as OrderImportField);

    onChange(
      mapping.map((current, index) =>
        index === column ? field : current === field ? null : current,
      ),
    );
  };

  return (
    <div className="shadow-elevation-card-rest overflow-hidden rounded-lg">
      <div className="bg-ui-bg-subtle txt-compact-xsmall-plus text-ui-fg-subtle grid grid-cols-[minmax(0,12rem)_1.5rem_14rem_minmax(0,1fr)] items-center gap-x-3 px-4 py-2">
        <span>{t("orders.import.map.columns.file")}</span>
        <span />
        <span>{t("orders.import.map.columns.field")}</span>
        <span>{t("orders.import.map.columns.sample")}</span>
      </div>
      {headers.map((header, column) => (
        <div
          key={column}
          className="border-ui-border-base grid grid-cols-[minmax(0,12rem)_1.5rem_14rem_minmax(0,1fr)] items-center gap-x-3 border-t px-4 py-1.5"
        >
          <Text size="small" className="truncate" title={header}>
            {header}
          </Text>
          <ArrowRightMini className="text-ui-fg-muted justify-self-center" />
          <Select
            size="small"
            value={mapping[column] ?? SKIP}
            onValueChange={(value) => pick(column, value)}
          >
            <Select.Trigger
              aria-label={header}
              className={clx(!mapping[column] && "text-ui-fg-muted")}
            >
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={SKIP}>
                {t("orders.import.map.skip")}
              </Select.Item>
              {ORDER_IMPORT_FIELDS.map((field) => (
                <Select.Item key={field} value={field}>
                  {t(`orders.import.fields.${field}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Text
            size="small"
            className="text-ui-fg-muted truncate"
            title={sample[column]}
          >
            {sample[column]}
          </Text>
        </div>
      ))}
    </div>
  );
};
