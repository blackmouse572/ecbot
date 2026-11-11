import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import {
  useOrder,
  useUpdateOrder,
  type OrderGetResponseDto,
} from "@/hooks/api/orders";
import { useProductGroups } from "@/hooks/api/product-groups";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Text, toast } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { OrderFormFields } from "../components/order-form-fields";
import { useOrderItemsRequest } from "../components/use-order-items-request";
import { itemsTotal } from "../utils";
import { ORDER_CONSTANTS } from "../constants";
import { orderFormSchema, type OrderFormData } from "../schemas";

/** Sửa đơn: frame 14c's form over the order, back to its drawer on close. */
export const OrderEdit = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { orderId = "" } = useParams<{ orderId: string }>();

  const { order, isLoading, isError, error } = useOrder(workspaceSlug, orderId);

  if (isError) {
    throw error;
  }

  return (
    <RouteFocusModal prev={`../${orderId}`}>
      {isLoading || !order ? (
        <>
          <RouteFocusModal.Header>
            <RouteFocusModal.Title asChild>
              <span className="sr-only">{t("orders.form.editTitle")}</span>
            </RouteFocusModal.Title>
          </RouteFocusModal.Header>
          <RouteFocusModal.Body className="flex justify-center px-6 py-10">
            <div className="w-full max-w-[720px]">
              <FormSkeleton label={t("general.loading")} />
            </div>
          </RouteFocusModal.Body>
        </>
      ) : (
        <OrderEditForm order={order} />
      )}
    </RouteFocusModal>
  );
};

const toFormData = (order: OrderGetResponseDto): OrderFormData => {
  const items = order.items.map((item) => ({
    name: item.name,
    group:
      item.productGroupId && item.productGroupName
        ? { id: item.productGroupId, name: item.productGroupName }
        : null,
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? null,
  }));

  return {
    customerId: order.customerId,
    items,
    // An order known by its total alone (or a total the shop typed) keeps it.
    customTotal: itemsTotal(items) === order.total ? null : order.total,
    code: order.code,
    orderedAt: new Date(order.orderedAt),
    status: order.status === "PENDING" ? "PENDING" : "CONFIRMED",
    note: order.note ?? "",
  };
};

const OrderEditForm: FC<{ order: OrderGetResponseDto }> = ({ order }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();

  const { groups } = useProductGroups(workspaceSlug, {
    perPage: ORDER_CONSTANTS.GROUP_PAGE_SIZE,
  });

  const { mutateAsync, isPending } = useUpdateOrder(workspaceSlug, order.id);
  const toItems = useOrderItemsRequest();

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: toFormData(order),
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    // Groups first, outside the order's try: their errors are not the order's.
    const items = await toItems(data.items, groups);

    if (!items) return;

    try {
      await mutateAsync({
        code: data.code || undefined,
        items,
        total: data.customTotal ?? itemsTotal(data.items),
        orderedAt: data.orderedAt.toISOString(),
        note: data.note || null,
      });
      toast.success(t("orders.form.saved"));
      handleSuccess(`../${order.id}`);
    } catch (error) {
      const { status, message } = readApiError(error);

      if (status === 409) {
        form.setError("code", { message: t("orders.form.errors.codeTaken") });

        return;
      }

      toast.error(message ?? t("orders.error"));
    }
  });

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header>
          <RouteFocusModal.Title asChild>
            <span className="sr-only">{t("orders.form.editTitle")}</span>
          </RouteFocusModal.Title>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-10">
          <OrderFormFields
            title={t("orders.form.editTitle")}
            description={t("orders.form.editDescription", { code: order.code })}
            groups={groups}
            currency={order.currency}
            withStatus={false}
            customer={
              <div className="flex flex-col gap-y-1">
                <Text size="small" weight="plus">
                  {t("orders.form.customer")}
                </Text>
                <Text size="small">
                  {order.customerName || t("orders.noName")}
                  {order.customerPhone && (
                    <span className="text-ui-fg-subtle tabular-nums">
                      {" "}
                      {order.customerPhone}
                    </span>
                  )}
                </Text>
              </div>
            }
          />
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};
