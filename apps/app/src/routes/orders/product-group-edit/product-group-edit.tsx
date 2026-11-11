import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import {
  useCreateProductGroup,
  useProductGroups,
  useUpdateProductGroup,
  type ProductGroupGetResponseDto,
} from "@/hooks/api/product-groups";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Input, toast } from "@medusajs/ui";
import { Form, FormSkeleton, NoRecords } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ORDER_CONSTANTS } from "../constants";
import { productGroupFormSchema, type ProductGroupFormData } from "../schemas";

/**
 * Tạo nhóm hàng and its edit, one short drawer: a name and the cycle the shop
 * sets. Two fields do not need the full-screen create modal.
 */
export const ProductGroupEdit = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { groupId } = useParams<{ groupId: string }>();

  // The list has no detail endpoint; a shop has few groups, so read them all.
  const { groups, isLoading, isError, error } = useProductGroups(
    workspaceSlug,
    { perPage: ORDER_CONSTANTS.GROUP_PAGE_SIZE },
  );

  const group = groupId
    ? groups.find((item) => item.id === groupId)
    : undefined;

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>
            {t(
              groupId ? "orders.groups.form.editTitle" : "orders.groups.create",
            )}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("orders.groups.form.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {groupId && isLoading ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : groupId && !group ? (
        <RouteDrawer.Body className="p-6">
          <NoRecords
            title={t("orders.groups.form.notFoundTitle")}
            message={t("orders.groups.form.notFoundMessage")}
          />
        </RouteDrawer.Body>
      ) : (
        <ProductGroupForm group={group} />
      )}
    </RouteDrawer>
  );
};

const ProductGroupForm: FC<{ group?: ProductGroupGetResponseDto }> = ({
  group,
}) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  const create = useCreateProductGroup(workspaceSlug);
  const update = useUpdateProductGroup(workspaceSlug, group?.id ?? "");

  const form = useForm<ProductGroupFormData>({
    resolver: zodResolver(productGroupFormSchema),
    defaultValues: {
      name: group?.name ?? "",
      defaultRepurchaseDays: group?.defaultRepurchaseDays ?? null,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      if (group) {
        await update.mutateAsync(data);
        toast.success(t("orders.groups.form.saved"));
      } else {
        await create.mutateAsync(data);
        toast.success(t("orders.groups.form.created"));
      }

      handleSuccess();
    } catch (error) {
      const { status, message } = readApiError(error);

      if (status === 409) {
        form.setError("name", {
          message: t("orders.groups.form.errors.nameTaken"),
        });

        return;
      }

      toast.error(message ?? t("orders.error"));
    }
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("orders.groups.columns.name")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    placeholder={t("orders.groups.form.namePlaceholder")}
                  />
                </Form.Control>
                <Form.Hint>{t("orders.groups.form.nameHint")}</Form.Hint>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="defaultRepurchaseDays"
            render={({ field: { value, onChange, ...field } }) => (
              <Form.Item>
                <Form.Label optional>{t("orders.groups.form.days")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={730}
                    className="tabular-nums"
                    placeholder="45"
                    value={value ?? ""}
                    onChange={(event) =>
                      onChange(
                        event.target.value === ""
                          ? null
                          : event.target.valueAsNumber,
                      )
                    }
                  />
                </Form.Control>
                <Form.Hint>{t("orders.groups.form.daysHint")}</Form.Hint>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button
              size="small"
              type="submit"
              isLoading={create.isPending || update.isPending}
            >
              {group ? t("actions.save") : t("orders.groups.create")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};
