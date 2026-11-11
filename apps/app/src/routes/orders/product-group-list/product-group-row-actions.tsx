import {
  useDeleteProductGroup,
  type ProductGroupGetResponseDto,
} from "@/hooks/api/product-groups";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { PencilSquare, Trash } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import { ActionMenu } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/** A group row's ⋯ menu: edit, or delete (items keep their name). */
export const ProductGroupRowActions: FC<{
  group: ProductGroupGetResponseDto;
}> = ({ group }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const { workspaceSlug } = useWorkspaceParams();
  const { mutateAsync: remove } = useDeleteProductGroup(workspaceSlug);

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("orders.groups.delete.title", { name: group.name }),
      description: t("orders.groups.delete.description"),
      variant: "danger",
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await remove(group.id);
      toast.success(t("orders.groups.delete.deleted"));
    } catch (error) {
      toast.error(readApiError(error).message ?? t("orders.error"));
    }
  };

  return (
    <div className="flex justify-end">
      <ActionMenu
        groups={[
          {
            actions: [
              {
                icon: <PencilSquare />,
                label: t("actions.edit"),
                onClick: () => navigate(`${group.id}/edit`),
              },
            ],
          },
          {
            actions: [
              {
                icon: <Trash />,
                label: t("actions.delete"),
                onClick: handleDelete,
              },
            ],
          },
        ]}
      />
    </div>
  );
};
