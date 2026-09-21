import { useDeleteSkill } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { PencilSquare, SquareTwoStack, Trash } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import type { SkillListResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const SkillActions = ({
  item,
}: {
  item: Pick<SkillListResponseDto, "id" | "name" | "isBuiltin">;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const prompt = usePrompt();
  const { deleteSkill } = useDeleteSkill(workspaceSlug);

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("skills.delete.confirm.title"),
      description: t("skills.delete.confirm.description"),
      variant: "danger",
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    });
    if (!confirmed) return;
    try {
      await deleteSkill(item.id);
      toast.success(t("skills.delete.success"));
    } catch {
      toast.error(t("skills.delete.error"));
    }
  };

  const copyAction = {
    icon: <SquareTwoStack />,
    label: t("actions.copy"),
    onClick: () => navigate(`${item.id}/copy`),
  };

  if (item.isBuiltin) {
    return <ActionMenu groups={[{ actions: [copyAction] }]} />;
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              onClick: () => navigate(`${item.id}/edit`),
            },
            copyAction,
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
  );
};
