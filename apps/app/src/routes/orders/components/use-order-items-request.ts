import type { OrderItemRequestDto } from "@/hooks/api/orders";
import {
  useCreateProductGroup,
  type ProductGroupGetResponseDto,
} from "@/hooks/api/product-groups";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { toast } from "@medusajs/ui";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { OrderFormData } from "../schemas";

const nameKey = (name: string) => name.trim().toLocaleLowerCase("vi");

/**
 * The items as the API takes them. A group typed as a new name is created
 * first, once per name, so the item can point at it. Resolves to null, after a
 * toast, when a group cannot be created, so the order is not sent.
 */
export const useOrderItemsRequest = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { mutateAsync: createGroup } = useCreateProductGroup(workspaceSlug);
  // Groups this form made, kept across saves: a retry after a failed order
  // reuses them even before the group list has refetched.
  const made = useRef(new Map<string, string>());

  return async (
    items: OrderFormData["items"],
    groups: ProductGroupGetResponseDto[],
  ): Promise<OrderItemRequestDto[] | null> => {
    const known = new Map(made.current);

    for (const group of groups) known.set(nameKey(group.name), group.id);

    for (const { group } of items) {
      if (!group || group.id || known.has(nameKey(group.name))) continue;

      try {
        const saved = await createGroup({ name: group.name.trim() });

        known.set(nameKey(group.name), saved.id);
        made.current.set(nameKey(group.name), saved.id);
      } catch (error) {
        toast.error(
          readApiError(error).message ??
            t("orders.form.errors.group", { name: group.name.trim() }),
        );

        return null;
      }
    }

    return items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      productGroupId: item.group
        ? (item.group.id ?? known.get(nameKey(item.group.name)) ?? null)
        : null,
    }));
  };
};
