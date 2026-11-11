import type { OrderGetResponseDto } from "@/hooks/api/orders";
import { StatusBadge } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ORDER_STATUS_COLOR } from "../constants";

export const OrderStatusBadge: FC<{
  status: OrderGetResponseDto["status"];
}> = ({ status }) => {
  const { t } = useTranslation();

  return (
    <StatusBadge
      color={ORDER_STATUS_COLOR[status]}
      className="whitespace-nowrap"
    >
      {t(`orders.status.${status}`)}
    </StatusBadge>
  );
};
