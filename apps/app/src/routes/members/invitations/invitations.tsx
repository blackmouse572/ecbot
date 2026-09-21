import {
  useInvitations,
  useRevokeInvitation,
  useUpdateInvitationRole,
} from "@/hooks/api/invitations";
import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
import { Trash } from "@medusajs/icons";
import {
  Badge,
  Container,
  IconButton,
  Select,
  Text,
  toast,
} from "@medusajs/ui";
import { SingleColumnPage } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";

export const Invitations = () => {
  const { t } = useTranslation();
  const { invitations, isLoading } = useInvitations({
    orderBy: "createdAt",
    orderDirection: "desc",
    page: 1,
    perPage: 100,
  });
  const { roles } = useWorkspaceRoles({ perPage: 100 });
  const { mutateAsync: updateRole } = useUpdateInvitationRole();
  const { mutateAsync: revokeInvitation } = useRevokeInvitation();

  const handleUpdateRole = (id: string, role: string) =>
    toast.promise(updateRole({ id, role }), {
      loading: t("members.inviteMember.loading"),
      success: t("members.inviteMember.success"),
      error: t("errorBoundary.internalServerErrorMessage"),
    });

  const handleRevoke = (id: string) =>
    toast.promise(revokeInvitation(id), {
      loading: t("members.invitedMember.revoke.loading"),
      success: t("members.invitedMember.revoke.success"),
      error: t("errorBoundary.internalServerErrorMessage"),
    });

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Text weight="plus">{t("members.invitations.title")}</Text>
        </div>
        {isLoading ? null : invitations && invitations.length > 0 ? (
          invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between gap-x-4 px-6 py-3"
            >
              <div className="flex flex-col items-start gap-y-1">
                <Text size="small" weight="plus">
                  {invitation.inviteeEmail}
                </Text>
                <Badge size="2xsmall">{invitation.status}</Badge>
              </div>
              <div className="flex items-center gap-x-2">
                <Select
                  value={invitation.role}
                  onValueChange={(role) =>
                    handleUpdateRole(invitation.id, role)
                  }
                >
                  <Select.Trigger className="w-[160px]">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {roles.map((role) => (
                      <Select.Item
                        key={role.id}
                        value={role.id}
                        textValue={role.name}
                      >
                        {role.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                <IconButton
                  variant="transparent"
                  onClick={() => handleRevoke(invitation.id)}
                >
                  <Trash />
                </IconButton>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8">
            <Text className="text-ui-fg-muted">
              {t("members.invitations.empty")}
            </Text>
          </div>
        )}
      </Container>
    </SingleColumnPage>
  );
};
