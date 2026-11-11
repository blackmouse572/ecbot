import type { OrderItemRequestDto } from "@/hooks/api/orders";
import {
  useCreateProductGroup,
  type ProductGroupGetResponseDto,
} from "@/hooks/api/product-groups";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import type { OrderFormData } from "../schemas";

const nameKey = (name: string) => name.trim().toLocaleLowerCase("vi");

/**
 * The items as the API takes them. A group typed as a new name is created
 * first, once per name, so the item can point at it.
 */
export const useOrderItemsRequest = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const { mutateAsync: createGroup } = useCreateProductGroup(workspaceSlug);

  return async (
    items: OrderFormData["items"],
    groups: ProductGroupGetResponseDto[],
  ): Promise<OrderItemRequestDto[]> => {
    // Names that exist by now, such as one created by a save that then failed.
    const created = new Map(
      groups.map((group) => [nameKey(group.name), group.id]),
    );

    for (const { group } of items) {
      if (!group || group.id || created.has(nameKey(group.name))) continue;
      const saved = await createGroup({ name: group.name.trim() });

      if (saved) created.set(nameKey(group.name), saved.id);
    }

    return items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      productGroupId: item.group
        ? (item.group.id ?? created.get(nameKey(item.group.name)) ?? null)
        : null,
    }));
  };
};
