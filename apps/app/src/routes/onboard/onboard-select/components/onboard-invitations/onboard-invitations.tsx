import {
  invitationText,
  useMyInvitationActions,
} from "@/components/invitations/use-my-invitation-actions";
import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { useMyInvitations } from "@/hooks/api/workspace-member";
import { Avatar, Button, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

/**
 * One card per pending invitation, so an invited person joins with the role
 * the owner chose instead of creating a workspace of their own.
 */
export const OnboardInvitations = () => {
  const { t } = useTranslation();
  const { invitations } = useMyInvitations();
  const { accept, decline, busyId } = useMyInvitationActions();

  if (invitations.length === 0) return null;

  return (
    <ul
      className="flex w-full flex-col gap-2"
      aria-label={t("workspace.invitations.title")}
    >
      {invitations.map((invitation) => {
        const busy = busyId === invitation.id;

        return (
          <li
            key={invitation.id}
            className="shadow-elevation-card-rest bg-ui-bg-base flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-x-3">
              <Avatar
                variant="squared"
                size="small"
                fallback={getAvatarFallback(invitation.workspace.name)}
                src={invitation.workspace.avatar ?? undefined}
              />
              <Text size="small" leading="compact" className="min-w-0">
                {invitationText(t, invitation)}
              </Text>
            </div>
            <div className="flex shrink-0 gap-2 self-end sm:self-auto">
              <Button
                type="button"
                size="small"
                variant="secondary"
                disabled={!!busyId}
                onClick={() => decline(invitation)}
              >
                {t("workspace.invitations.decline")}
              </Button>
              <Button
                type="button"
                size="small"
                isLoading={busy}
                disabled={!!busyId}
                onClick={() => accept(invitation)}
              >
                {t("workspace.invitations.accept")}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
