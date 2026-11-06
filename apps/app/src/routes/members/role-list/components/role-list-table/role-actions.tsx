import { useDeleteWorkspaceRole } from "@/hooks/api/workspace-roles";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { ROUTES } from "@/routes/constants";
import { Pencil, Trash } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import type { RoleListResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

/** Row menu of the roles table: edit or delete a custom role. */
export const RoleActions = ({ item }: { item: RoleListResponseDto }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const navigate = useNavigate();
  const dialog = usePrompt();
  const location = useLocation();
  const deleteRole = useDeleteWorkspaceRole();

  // Built-in roles (Admin, Member, owner) carry permissions the form cannot
  // show, so only custom roles can be edited or deleted here.
  if (item.type !== "USER") {
    return null;
  }

  const deleteRoleHandler = async () => {
    const confirmed = await dialog({
      title: t("roles.delete.title"),
      description: t("roles.delete.description"),
      variant: "danger",
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    });

    if (!confirmed) return;

    try {
      await deleteRole.mutateAsync(item.id);
      toast.success(t("roles.delete.success"));
    } catch (error) {
      toast.error(readApiError(error).message ?? t("roles.delete.error"));
    }
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Pencil />,
              label: t("actions.edit"),
              onClick: () =>
                navigate(
                  `/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.WorkspaceRoles}/${item.id}/edit`,
                  {
                    state: { prev: location.pathname },
                  },
                ),
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: () => deleteRoleHandler(),
            },
          ],
        },
      ]}
    />
  );
};
