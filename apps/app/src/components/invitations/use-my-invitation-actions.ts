import { translateRoleName } from "@/components/layout/workspace-switcher/use-workspace-role-label";
import {
  useAcceptMyInvitation,
  useDeclineMyInvitation,
  type MyInvitation,
} from "@/hooks/api/workspace-member";
import { readApiError } from "@/libs/api-error";
import { ROUTES } from "@/routes/constants";
import { toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate } from "react-router-dom";

/** "Lan invited you to Moc Coffee as Member". */
export const invitationText = (t: TFunction, invitation: MyInvitation) =>
  t("workspace.invitations.invitedYou", {
    inviter: invitation.inviterName,
    workspace: invitation.workspace.name,
    role: translateRoleName(t, invitation.roleName),
  });

/**
 * Accept (lands on that workspace's dashboard) and Decline for one of my
 * invitations, shared by /onboard and the notification bell.
 */
export const useMyInvitationActions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const acceptMutation = useAcceptMyInvitation();
  const declineMutation = useDeclineMyInvitation();

  const fail = (e: unknown) =>
    toast.error(readApiError(e).message ?? t("workspace.invitations.failed"));

  const accept = async (invitation: MyInvitation) => {
    try {
      const { workspace, roleName } = await acceptMutation.mutateAsync(
        invitation.id,
      );

      toast.success(
        t("workspace.invitations.joined", {
          workspace: workspace.name,
          role: translateRoleName(t, roleName),
        }),
      );
      navigate(`/${workspace.slug}/${ROUTES.Dashboard}`);
    } catch (e) {
      fail(e);
    }
  };

  const decline = async (invitation: MyInvitation) => {
    try {
      await declineMutation.mutateAsync(invitation.id);
      toast.success(t("workspace.invitations.declined"));
    } catch (e) {
      fail(e);
    }
  };

  // Which row is busy, so only its buttons spin.
  const busyId =
    (acceptMutation.isPending && acceptMutation.variables) ||
    (declineMutation.isPending && declineMutation.variables) ||
    undefined;

  return { accept, decline, busyId };
};
