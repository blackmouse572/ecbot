import type { ProductGroupGetResponseDto } from "@/hooks/api/product-groups";
import { PlusMini, Trash } from "@medusajs/icons";
import { Button, IconButton, Input, Label, Text } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { OrderFormData } from "../schemas";
import { emptyOrderItem, formatMoney, itemsTotal } from "../utils";
import { MoneyInput } from "./money-input";
import { ProductGroupCombobox } from "./product-group-combobox";

const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_10rem_4rem_8rem_7rem_1.75rem] items-start gap-x-2";

/** The Sản phẩm rows and the Tổng tiền line of frame 14c. */
export const OrderItemsField: FC<{
  groups: ProductGroupGetResponseDto[];
  currency: string;
}> = ({ groups, currency }) => {
  const { t, i18n } = useTranslation();
  const form = useFormContext<OrderFormData>();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [items, customTotal] = useWatch({
    control: form.control,
    name: ["items", "customTotal"],
  });

  const money = (amount: number) =>
    formatMoney(amount, currency, i18n.language);

  const itemsError =
    form.formState.errors.items?.root ?? form.formState.errors.items;

  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        {t("orders.form.items")}
      </Label>
      {fields.length > 0 && (
        <div
          className={`${COLUMNS} txt-compact-small text-ui-fg-subtle`}
          aria-hidden
        >
          <span>{t("orders.form.itemName")}</span>
          <span>{t("orders.form.group")}</span>
          <span>{t("orders.form.quantity")}</span>
          <span>{t("orders.form.unitPrice")}</span>
          <span className="text-right">{t("orders.form.lineTotal")}</span>
        </div>
      )}
      {fields.map((field, index) => {
        const item = items?.[index];

        const line =
          item?.unitPrice == null ? null : item.unitPrice * item.quantity;

        return (
          <div key={field.id} className={COLUMNS}>
            <Form.Field
              control={form.control}
              name={`items.${index}.name`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Control>
                    <Input
                      {...field}
                      aria-label={t("orders.form.itemName")}
                      placeholder={t("orders.form.itemNamePlaceholder")}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name={`items.${index}.group`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Control>
                    <ProductGroupCombobox
                      groups={groups}
                      value={field.value}
                      onChange={field.onChange}
                      aria-label={t("orders.form.group")}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name={`items.${index}.quantity`}
              render={({ field: { onChange, value, ...field } }) => (
                <Form.Item>
                  <Form.Control>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      className="text-right tabular-nums"
                      aria-label={t("orders.form.quantity")}
                      value={Number.isNaN(value) ? "" : value}
                      onChange={(event) => onChange(event.target.valueAsNumber)}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name={`items.${index}.unitPrice`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Control>
                    <MoneyInput
                      {...field}
                      className="text-right tabular-nums"
                      aria-label={t("orders.form.unitPrice")}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <Text
              size="small"
              weight="plus"
              className="flex h-8 items-center justify-end tabular-nums"
            >
              {line === null ? "-" : money(line)}
            </Text>
            <IconButton
              type="button"
              variant="transparent"
              size="small"
              className="mt-1"
              aria-label={t("orders.form.removeItem")}
              onClick={() => remove(index)}
            >
              <Trash />
            </IconButton>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="transparent"
          size="small"
          className="-ml-2"
          onClick={() => append(emptyOrderItem())}
        >
          <PlusMini />
          {t("orders.form.addItem")}
        </Button>
      </div>
      {itemsError?.message && (
        <Text size="small" className="text-ui-fg-error">
          {itemsError.message}
        </Text>
      )}
      <div className="bg-ui-bg-subtle flex items-center justify-between gap-x-4 rounded-lg px-4 py-3">
        <Text size="small" weight="plus">
          {t("orders.form.total")}
        </Text>
        {customTotal === null ? (
          <div className="flex items-center gap-x-3">
            <Button
              type="button"
              variant="transparent"
              size="small"
              className="text-ui-fg-interactive"
              onClick={() =>
                form.setValue("customTotal", itemsTotal(items ?? []), {
                  shouldDirty: true,
                })
              }
            >
              {t("orders.form.customTotal")}
            </Button>
            <Text weight="plus" className="tabular-nums">
              {money(itemsTotal(items ?? []))}
            </Text>
          </div>
        ) : (
          <div className="flex items-center gap-x-3">
            <Button
              type="button"
              variant="transparent"
              size="small"
              className="text-ui-fg-interactive"
              onClick={() =>
                form.setValue("customTotal", null, { shouldDirty: true })
              }
            >
              {t("orders.form.itemsTotal")}
            </Button>
            <Form.Field
              control={form.control}
              name="customTotal"
              render={({ field }) => (
                <MoneyInput
                  {...field}
                  autoFocus
                  className="w-36 text-right tabular-nums"
                  aria-label={t("orders.form.total")}
                />
              )}
            />
          </div>
        )}
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        {t("orders.form.groupHint")}
      </Text>
    </div>
  );
};
