import type { ProductGroupGetResponseDto } from "@/hooks/api/product-groups";
import {
  DatePicker,
  Heading,
  Input,
  RadioGroup,
  Text,
  Textarea,
  clx,
} from "@medusajs/ui";
import { I18nProvider } from "@/providers/i18n/i18n-provider";
import { Form } from "@repo/ui/common-components";
import type { FC, ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ORDER_FORM_STATUSES } from "../constants";
import type { OrderFormData } from "../schemas";
import { timeOf, withDay, withTime } from "../utils";
import { OrderItemsField } from "./order-items-field";

/**
 * The body of frame 14c, shared by Thêm đơn and Sửa đơn. Sửa đơn passes the
 * customer as plain text and leaves out the status, which only Xác nhận and
 * Huỷ change.
 */
export const OrderFormFields: FC<{
  title: string;
  description: string;
  customer: ReactNode;
  groups: ProductGroupGetResponseDto[];
  currency: string;
  withStatus: boolean;
}> = ({ title, description, customer, groups, currency, withStatus }) => {
  const { t } = useTranslation();
  const form = useFormContext<OrderFormData>();

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div>
        <Heading>{title}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {description}
        </Text>
      </div>
      {customer}
      <OrderItemsField groups={groups} currency={currency} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Form.Field
          control={form.control}
          name="code"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("orders.form.code")}</Form.Label>
              <Form.Control>
                <Input
                  {...field}
                  className="font-mono placeholder:font-sans"
                  placeholder={t("orders.form.codePlaceholder")}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="orderedAt"
          render={({ field: { value, onChange } }) => (
            <Form.Item>
              <Form.Label>{t("orders.form.orderedAt")}</Form.Label>
              {/* The picker writes the date the way the UI language does
                  (11/8 is 11 August in Vietnamese), not the browser's. The
                  time sits in its own field: in Vietnamese one field would
                  put the time first. */}
              <div className="grid grid-cols-[1fr_7rem] gap-x-2">
                <I18nProvider>
                  <Form.Control>
                    <DatePicker
                      value={value}
                      onChange={(date) =>
                        date && onChange(withDay(value, date))
                      }
                    />
                  </Form.Control>
                </I18nProvider>
                <Input
                  type="time"
                  aria-label={t("orders.form.orderedTime")}
                  className="tabular-nums"
                  value={timeOf(value)}
                  onChange={(event) =>
                    event.target.value &&
                    onChange(withTime(value, event.target.value))
                  }
                />
              </div>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>
      {withStatus && (
        <Form.Field
          control={form.control}
          name="status"
          render={({ field: { value, onChange } }) => (
            <Form.Item>
              <Form.Label>{t("orders.form.status")}</Form.Label>
              <Form.Control>
                <RadioGroup
                  value={value}
                  onValueChange={onChange}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  {ORDER_FORM_STATUSES.map((status) => (
                    <label
                      key={status}
                      className={clx(
                        "shadow-borders-base bg-ui-bg-base flex cursor-pointer items-start gap-x-3 rounded-lg p-3",
                        value === status &&
                          "shadow-borders-interactive-with-active",
                      )}
                    >
                      <RadioGroup.Item value={status} className="mt-0.5" />
                      <span className="flex flex-col">
                        <Text size="small" weight="plus">
                          {t(`orders.status.${status}`)}
                        </Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          {t(`orders.form.statusHint.${status}`)}
                        </Text>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </Form.Control>
            </Form.Item>
          )}
        />
      )}
      <Form.Field
        control={form.control}
        name="note"
        render={({ field }) => (
          <Form.Item>
            <Form.Label optional>{t("orders.form.note")}</Form.Label>
            <Form.Control>
              <Textarea
                {...field}
                rows={3}
                placeholder={t("orders.form.notePlaceholder")}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </div>
  );
};
