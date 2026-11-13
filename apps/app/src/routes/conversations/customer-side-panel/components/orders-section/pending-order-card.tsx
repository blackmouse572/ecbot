import {
  useCancelOrder,
  useConfirmOrder,
  type OrderGetResponseDto,
} from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { OrderStatusBadge } from "@/routes/orders/components/order-status-badge";
import {
  formatMoney,
  formatOrderedAt,
  itemsSummary,
} from "@/routes/orders/utils";
import { ChatBubble, CheckMini } from "@medusajs/icons";
import { Button, Text, toast, usePrompt } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** Frame 13c's orange card: an order awaiting confirmation, confirmed or cancelled in place. */
export const PendingOrderCard: FC<{ order: OrderGetResponseDto }> = ({
  order,
}) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const prompt = usePrompt();
  const confirm = useConfirmOrder(workspaceSlug, order.id);
  const cancel = useCancelOrder(workspaceSlug, order.id);

  const handleConfirm = async () => {
    try {
      await confirm.mutateAsync();
      toast.success(t("orders.detail.confirmed"));
    } catch (error) {
      toast.error(readApiError(error).message ?? t("orders.error"));
    }
  };

  const handleCancel = async () => {
    const confirmed = await prompt({
      title: t("orders.detail.cancelTitle", { code: order.code }),
      description: t("orders.detail.cancelDescription"),
      variant: "danger",
      confirmText: t("orders.detail.cancel"),
      cancelText: t("orders.detail.keep"),
    });

    if (!confirmed) return;

    try {
      await cancel.mutateAsync();
      toast.success(t("orders.detail.cancelled"));
    } catch (error) {
      toast.error(readApiError(error).message ?? t("orders.error"));
    }
  };

  return (
    <div className="bg-ui-bg-base border-ui-tag-orange-border flex flex-col gap-y-1 rounded-lg border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <OrderStatusBadge status={order.status} />
        <Text
          size="xsmall"
          className="text-ui-fg-muted flex items-center gap-x-1"
        >
          {order.source === "CHAT" && <ChatBubble className="size-3.5" />}
          {order.source === "CHAT"
            ? t("orders.panel.botNoted", {
                when: formatOrderedAt(order.orderedAt, i18n.language),
              })
            : formatOrderedAt(order.orderedAt, i18n.language)}
        </Text>
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        {itemsSummary(order) || t("orders.noItems")}
      </Text>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text size="small" weight="plus" className="tabular-nums">
          {formatMoney(order.total, order.currency, i18n.language)}
        </Text>
        <div className="ml-auto flex items-center gap-x-1.5 whitespace-nowrap">
          <Button
            size="small"
            variant="secondary"
            onClick={handleCancel}
            isLoading={cancel.isPending}
          >
            {t("orders.panel.cancel")}
          </Button>
          <Button
            size="small"
            onClick={handleConfirm}
            isLoading={confirm.isPending}
          >
            <CheckMini />
            {t("orders.panel.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
};
