/**
 * Builds the workspace-invitation link the invitee receives by e-mail.
 *
 * The join page lives at `/join` on the frontend and reads the token from the
 * `tokens` query param — see
 * `apps/app/src/routes/join/components/join-form/join-form.tsx`.
 */
export function buildInvitationLink(clientUrl: string, token: string): string {
    return `${clientUrl.replace(/\/+$/, '')}/join?tokens=${token}`;
}
