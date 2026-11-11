import { useCustomer } from "@/hooks/api/customers";
import { User } from "@medusajs/icons";
import { Button, Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

/** Shown when the list is one customer's orders (Xem tất cả đơn on the customer panel). */
export const CustomerFilterBanner: FC<{ customerId: string }> = ({
  customerId,
}) => {
  const { t } = useTranslation();
  const [, setParams] = useSearchParams();
  const { customer } = useCustomer(customerId);

  return (
    <div className="bg-ui-bg-subtle flex flex-wrap items-center justify-between gap-3 px-6 py-3">
      <Text
        size="small"
        className="text-ui-fg-subtle flex items-center gap-x-2"
      >
        <User className="text-ui-fg-muted shrink-0" />
        {t("orders.panel.filtered", {
          name: customer?.name || customer?.phone || t("orders.noName"),
        })}
      </Text>
      <Button
        size="small"
        variant="secondary"
        type="button"
        onClick={() =>
          setParams((current) => {
            const next = new URLSearchParams(current);
            next.delete("customer");
            next.delete("page");

            return next;
          })
        }
      >
        {t("orders.panel.clearFilter")}
      </Button>
    </div>
  );
};
