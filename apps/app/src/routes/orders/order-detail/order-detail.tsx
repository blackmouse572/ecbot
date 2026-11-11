import { RouteDrawer, useRouteModal } from "@/components/modals";
import {
  useCancelOrder,
  useConfirmOrder,
  useOrder,
  useOrders,
  type OrderGetResponseDto,
} from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { ROUTES } from "@/routes/constants";
import { ChatBubble, Check } from "@medusajs/icons";
import { Badge, Button, Heading, Text, toast, usePrompt } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { OrderSourceLabel } from "../components/order-source-label";
import { OrderStatusBadge } from "../components/order-status-badge";
import {
  formatMoney,
  formatOrderedAt,
  orderGroupNames,
  orderedAtLabel,
} from "../utils";

/** Frame 14b: one order in a drawer over the list, with Xác nhận and Huỷ. */
export const OrderDetail = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { orderId = "" } = useParams<{ orderId: string }>();

  const { order, isLoading, isError, error } = useOrder(workspaceSlug, orderId);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading className="flex items-center gap-x-2">
            <span className="font-mono">{order?.code}</span>
            {order && <OrderStatusBadge status={order.status} />}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("orders.detail.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isLoading || !order ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : (
        <OrderDetailBody order={order} />
      )}
    </RouteDrawer>
  );
};

const Row: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div className="grid grid-cols-[8rem_1fr] gap-x-4">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="small" className="min-w-0 break-words">
      {children}
    </Text>
  </div>
);

const OrderDetailBody: FC<{ order: OrderGetResponseDto }> = ({ order }) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  const prompt = usePrompt();
  const confirm = useConfirmOrder(workspaceSlug, order.id);
  const cancel = useCancelOrder(workspaceSlug, order.id);

  const money = (amount: number) =>
    formatMoney(amount, order.currency, i18n.language);

  const groups = orderGroupNames(order);
  const pending = order.status === "PENDING";
  const cancelled = order.status === "CANCELLED";

  const orderedAt = formatOrderedAt(order.orderedAt, i18n.language);

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
      handleSuccess();
    } catch (error) {
      toast.error(readApiError(error).message ?? t("orders.error"));
    }
  };

  return (
    <>
      <RouteDrawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
        {order.source === "CHAT" && (
          <div className="bg-ui-bg-subtle shadow-borders-base flex flex-col gap-y-1 rounded-lg p-4">
            <Text
              size="small"
              weight="plus"
              className="flex items-center gap-x-2"
            >
              <ChatBubble className="text-ui-fg-interactive" />
              {t("orders.detail.fromChat", { when: orderedAt })}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {pending && t("orders.detail.fromChatHint")}{" "}
              {order.conversationId && (
                <Link
                  to={`/${workspaceSlug}/${ROUTES.Conversations}/${order.conversationId}`}
                  className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                >
                  {t("orders.detail.openConversation")}
                </Link>
              )}
            </Text>
          </div>
        )}

        <section className="flex flex-col gap-y-2">
          <Heading level="h3">{t("orders.detail.customer")}</Heading>
          <Row label={t("orders.detail.name")}>
            {order.customerName || t("orders.noName")}
          </Row>
          <Row label={t("orders.detail.phone")}>
            <span className="tabular-nums">{order.customerPhone ?? "-"}</span>
          </Row>
          <Row label={t("orders.detail.previous")}>
            <PreviousOrders order={order} />
          </Row>
        </section>

        <section className="flex flex-col gap-y-2">
          <div className="flex items-baseline justify-between">
            <Heading level="h3">{t("orders.detail.items")}</Heading>
            <Text size="small" className="text-ui-fg-muted">
              {t("orders.detail.currency", { currency: order.currency })}
            </Text>
          </div>
          <div className="shadow-borders-base divide-y rounded-lg">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-x-4 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-y-1">
                  <Text size="small" weight="plus">
                    {item.name}
                  </Text>
                  <div className="flex items-center gap-x-2">
                    {item.productGroupName && (
                      <Badge size="2xsmall">{item.productGroupName}</Badge>
                    )}
                    <Text
                      size="small"
                      className="text-ui-fg-subtle tabular-nums"
                    >
                      {item.unitPrice == null
                        ? `× ${item.quantity}`
                        : `${money(item.unitPrice)} × ${item.quantity}`}
                    </Text>
                  </div>
                </div>
                {item.unitPrice != null && (
                  <Text size="small" weight="plus" className="tabular-nums">
                    {money(item.unitPrice * item.quantity)}
                  </Text>
                )}
              </div>
            ))}
            <div className="bg-ui-bg-subtle flex items-center justify-between rounded-b-lg px-4 py-3">
              <Text size="small" weight="plus">
                {t("orders.form.total")}
              </Text>
              <Text size="small" weight="plus" className="tabular-nums">
                {money(order.total)}
              </Text>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-y-2">
          <Row label={t("orders.columns.orderedAt")}>{orderedAt}</Row>
          <Row label={t("orders.columns.source")}>
            <OrderSourceLabel source={order.source} />
          </Row>
          {order.note && <Row label={t("orders.form.note")}>{order.note}</Row>}
        </section>

        {pending && (
          <Text
            size="small"
            className="bg-ui-bg-subtle text-ui-fg-subtle rounded-lg px-4 py-3"
          >
            {groups.length
              ? t("orders.detail.afterConfirmGroups", {
                  groups: groups.join(", "),
                })
              : t("orders.detail.afterConfirm")}
          </Text>
        )}
      </RouteDrawer.Body>
      {!cancelled && (
        <RouteDrawer.Footer>
          <div className="flex w-full items-center justify-between gap-x-2">
            <Button
              size="small"
              variant="transparent"
              type="button"
              isLoading={cancel.isPending}
              onClick={handleCancel}
            >
              {t("orders.detail.cancel")}
            </Button>
            <div className="flex items-center gap-x-2">
              <Button size="small" variant="secondary" asChild>
                <Link to="edit">{t("orders.detail.edit")}</Link>
              </Button>
              {pending && (
                <Button
                  size="small"
                  type="button"
                  isLoading={confirm.isPending}
                  onClick={handleConfirm}
                >
                  <Check />
                  {t("orders.detail.confirm")}
                </Button>
              )}
            </div>
          </div>
        </RouteDrawer.Footer>
      )}
    </>
  );
};

/** "2 đơn, lần cuối 12/10 (Serum)": the customer's other confirmed orders. */
const PreviousOrders: FC<{ order: OrderGetResponseDto }> = ({ order }) => {
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const { orders, count, isLoading } = useOrders(workspaceSlug, {
    customer: order.customerId,
    status: "CONFIRMED",
    perPage: 2,
  });

  if (isLoading) return <>…</>;

  const others = orders.filter((other) => other.id !== order.id);
  const total = order.status === "CONFIRMED" ? count - 1 : count;
  const last = others[0];

  if (!total || !last) return <>{t("orders.detail.previousNone")}</>;

  const label = orderedAtLabel(last.orderedAt, i18n.language);
  const groups = orderGroupNames(last);

  return (
    <>
      {t("orders.detail.previousCount", {
        count: total,
        date:
          label.when === "earlier"
            ? label.date
            : t(`orders.date.${label.when}`, { time: label.time }),
      })}
      {groups.length > 0 && ` (${groups.join(", ")})`}
    </>
  );
};
