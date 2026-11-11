import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useCreateOrder } from "@/hooks/api/orders";
import { useProductGroups } from "@/hooks/api/product-groups";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CustomerCombobox } from "../components/customer-combobox";
import { OrderFormFields } from "../components/order-form-fields";
import { useOrderItemsRequest } from "../components/use-order-items-request";
import { emptyOrderItem, itemsTotal } from "../utils";
import { ORDER_CONSTANTS, ORDER_DEFAULT_CURRENCY } from "../constants";
import { orderFormSchema, type OrderFormData } from "../schemas";

export const OrderCreate = () => (
  <RouteFocusModal>
    <OrderCreateForm />
  </RouteFocusModal>
);

const OrderCreateForm = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();

  const { groups } = useProductGroups(workspaceSlug, {
    perPage: ORDER_CONSTANTS.GROUP_PAGE_SIZE,
  });

  const { mutateAsync, isPending } = useCreateOrder(workspaceSlug);
  const toItems = useOrderItemsRequest();

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: "",
      items: [emptyOrderItem()],
      customTotal: null,
      code: "",
      orderedAt: new Date(),
      status: "CONFIRMED",
      note: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await mutateAsync({
        customerId: data.customerId,
        code: data.code || undefined,
        items: await toItems(data.items, groups),
        total: data.customTotal ?? itemsTotal(data.items),
        status: data.status,
        orderedAt: data.orderedAt.toISOString(),
        note: data.note || undefined,
      });
      toast.success(t("orders.form.created"));
      handleSuccess();
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
            <span className="sr-only">{t("orders.form.createTitle")}</span>
          </RouteFocusModal.Title>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-10">
          <OrderFormFields
            title={t("orders.form.createTitle")}
            description={t("orders.form.createDescription")}
            groups={groups}
            currency={ORDER_DEFAULT_CURRENCY}
            withStatus
            customer={
              <Form.Field
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("orders.form.customer")}</Form.Label>
                    <Form.Control>
                      <CustomerCombobox
                        ref={field.ref}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </Form.Control>
                    <Form.Hint>{t("orders.form.customerHint")}</Form.Hint>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
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
              {t("orders.form.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};
