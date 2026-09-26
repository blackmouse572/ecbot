import { useDeleteWorkspaceMember, useMe } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Pencil, Trash } from "@medusajs/icons";
import { toast, usePrompt } from "@medusajs/ui";
import type { WorkspaceMemberListResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

type MemberRowActionsProps = { member: WorkspaceMemberListResponseDto };

/** Row menu of the members table: assign a role, or remove the member. */
export const MemberRowActions = ({ member }: MemberRowActionsProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useMe();
  const { workspaceSlug } = useWorkspaceParams();
  const location = useLocation();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const removeMember = useDeleteWorkspaceMember();

  const openRoleAssignment = () => {
    const base = `/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.WorkspaceMember}`;
    navigate(`${base}/${member.id}/assign`, {
      state: { prev: location.pathname },
    });
  };

  const removeFromWorkspace = async () => {
    const title = t("members.removeMember.title");
    const description = t("members.removeMember.description");

    if (!(await prompt({ title, description }))) {
      return;
    }

    const loading = t("members.removeMember.loading");
    const success = t("members.removeMember.success");
    const error = t("errorBoundary.internalServerErrorTitle");

    toast.promise(removeMember.mutateAsync(member.id), {
      loading,
      success,
      error,
    });
  };

  const groups = [
    {
      actions: [
        {
          icon: <Pencil />,
          label: t("members.assignRole.title"),
          onClick: openRoleAssignment,
        },
      ],
    },
    {
      actions: [
        {
          icon: <Trash />,
          label: t("actions.delete"),
          disabled: currentUser?.id === member.user.id,
          onClick: removeFromWorkspace,
        },
      ],
    },
  ];

  return <ActionMenu groups={groups} />;
};
