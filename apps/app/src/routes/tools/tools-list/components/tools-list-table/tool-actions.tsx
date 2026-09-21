import { useDeleteTool } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { PencilSquare, Trash } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import type { ToolListResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const ToolActions = ({
  item,
}: {
  item: Pick<ToolListResponseDto, "id" | "name">;
}) => {
  const { t } = useTranslation();
  const { deleteTool, isPending } = useDeleteTool(
    useWorkspaceParams().workspaceSlug,
  );
  const prompt = usePrompt();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("tools.delete.confirm.title"),
      description: t("tools.delete.confirm.description"),
      variant: "danger",
      confirmText: t("tools.delete.confirm.confirmButton"),
      cancelText: t("actions.cancel"),
    });
    if (!confirmed) return;

    try {
      await deleteTool(item.id);
      toast.success(t("tools.delete.success"));
      navigate(`/${workspaceSlug}/tools`);
    } catch (err) {
      type HttpError = { response?: { status?: number }; status?: number };
      const status =
        (err as HttpError)?.response?.status ?? (err as HttpError)?.status;
      if (status === 409) {
        toast.error(t("tools.delete.errorReferenced"));
      } else {
        toast.error(t("tools.delete.error"));
      }
    }
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              onClick: () =>
                navigate(`/${workspaceSlug}/tools/${item.id}/edit`),
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
              disabled: isPending,
            },
          ],
        },
      ]}
    />
  );
};
