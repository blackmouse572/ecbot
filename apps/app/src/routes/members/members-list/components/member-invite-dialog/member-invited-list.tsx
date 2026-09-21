import {
  useInvitations,
  useRevokeInvitation,
  useUpdateInvitationRole,
} from "@/hooks/api/invitations";
import { toast } from "@medusajs/ui";
import { CommandGroup } from "@repo/ui/components";
import { useTranslation } from "react-i18next";
import { InviteItemSkeleton } from "./member-invite-dialog-item";
import { InvitedMemberItem } from "./member-invited-dialog-item";

const INVITATIONS_PER_PAGE = 5;

type MemberInvitedListProps = {
  enabled?: boolean;
  search?: string;
};

export function MemberInvitedList({ enabled, search }: MemberInvitedListProps) {
  const { t } = useTranslation();
  const { invitations, isLoading, isFetching } = useInvitations(
    {
      orderBy: "createdAt",
      orderDirection: "desc",
      page: 1,
      perPage: INVITATIONS_PER_PAGE,
      search,
    },
    {
      enabled,
    },
  );
  const { mutateAsync: updateRole } = useUpdateInvitationRole();
  const { mutateAsync: revokeInvitation } = useRevokeInvitation();

  const changeRole = (invitation: { id: string }, role: string) => {
    toast.promise(updateRole({ id: invitation.id, role }), {
      loading: t("members.inviteMember.loading"),
      success: t("members.inviteMember.success"),
      error: t("errorBoundary.internalServerErrorMessage"),
    });
  };

  const revoke = (invitation: { id: string }) => {
    toast.promise(revokeInvitation(invitation.id), {
      loading: t("members.invitedMember.revoke.loading"),
      success: t("members.invitedMember.revoke.success"),
      error: t("errorBoundary.internalServerErrorMessage"),
    });
  };

  const isBusy = isLoading || isFetching;

  return (
    <CommandGroup heading={t("members.invitedMember.title")}>
      {isBusy &&
        Array.from({ length: INVITATIONS_PER_PAGE }).map((_, index) => (
          <InviteItemSkeleton key={index} />
        ))}

      {!isBusy &&
        invitations?.map((invitation) => (
          <InvitedMemberItem
            key={invitation.id}
            invitation={invitation}
            onUpdateRole={changeRole}
            onRevoke={revoke}
          />
        ))}
    </CommandGroup>
  );
}
