import {
  useInvitations,
  useRevokeInvitation,
  useUpdateInvitationRole,
} from "@/hooks/api/invitations";
import { Trash } from "@medusajs/icons";
import { Container, IconButton, Text, toast } from "@medusajs/ui";
import { ListSkeleton, NoRecords } from "@repo/ui/common-components";
import { SingleColumnPage } from "@repo/ui/layout";
import { IconMail } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InvitationRoleSelect } from "../components/invitation-role-select";
import { MemberInviteDialog } from "../members-list/components/member-invite-dialog";
import { InvitationStatusBadge } from "./invitation-status-badge";

export const Invitations = () => {
  const { t } = useTranslation();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const { invitations, isLoading, isError, error } = useInvitations({
    orderBy: "createdAt",
    orderDirection: "desc",
    page: 1,
    perPage: 100,
  });
  const { mutateAsync: updateRole } = useUpdateInvitationRole();
  const { mutateAsync: revokeInvitation } = useRevokeInvitation();

  const handleUpdateRole = (id: string, role: string) =>
    toast.promise(updateRole({ id, role }), {
      loading: t("members.invitedMember.updateRole.loading"),
      success: t("members.invitedMember.updateRole.success"),
      error: t("errorBoundary.internalServerErrorMessage"),
    });

  const handleRevoke = (id: string) =>
    toast.promise(revokeInvitation(id), {
      loading: t("members.invitedMember.revoke.loading"),
      success: t("members.invitedMember.revoke.success"),
      error: t("errorBoundary.internalServerErrorMessage"),
    });

  if (isError) throw error;
  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Text weight="plus">{t("members.invitations.title")}</Text>
        </div>
        {isLoading ? (
          <ListSkeleton label={t("general.loading")} className="px-6 py-4" />
        ) : invitations && invitations.length > 0 ? (
          <>
            <div className="flex items-center justify-between gap-x-4 px-6 py-2">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                {t("fields.email")}
              </Text>
              <Text
                size="small"
                weight="plus"
                className="text-ui-fg-subtle w-[160px] mr-10"
              >
                {t("fields.role")}
              </Text>
            </div>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-x-4 px-6 py-3"
              >
                <div className="flex flex-col items-start gap-y-1">
                  <Text size="small" weight="plus">
                    {invitation.inviteeEmail}
                  </Text>
                  <InvitationStatusBadge status={invitation.status} />
                </div>
                <div className="flex items-center gap-x-2">
                  <InvitationRoleSelect
                    className="w-[160px]"
                    value={invitation.role}
                    onValueChange={(role) =>
                      handleUpdateRole(invitation.id, role)
                    }
                  />
                  <IconButton
                    variant="transparent"
                    onClick={() => handleRevoke(invitation.id)}
                  >
                    <Trash />
                  </IconButton>
                </div>
              </div>
            ))}
          </>
        ) : (
          <NoRecords
            title={t("members.invitations.emptyTitle")}
            message={t("members.invitations.empty")}
            action={{
              onClick: () => setInviteOpen(true),
              label: t("members.inviteMember.action"),
            }}
            icon={<IconMail />}
          />
        )}
      </Container>
      <MemberInviteDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
    </SingleColumnPage>
  );
};
