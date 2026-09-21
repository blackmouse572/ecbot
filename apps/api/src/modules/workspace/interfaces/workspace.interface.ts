export interface InvitationLinkPayload {
    ownerId: string;
    workspaceId: string;
    invitedEmail: string;
    roleId?: string;
}
