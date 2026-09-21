import type { INestApplication } from '@nestjs/common';
import { http } from './http';

// The RouterModule mounts every workspace-scoped controller under the `/workspace`
// access-level segment, so full paths are `${base}/workspace/...`.
export const wsBase = (base: string) => `${base}/workspace`;

/**
 * Creates a fresh workspace via the real API. This is intentionally done through
 * HTTP (not a seed) because `POST /workspace/create` is what auto-provisions the
 * WORKSPACE_OWNER role, the default WORKSPACE_MEMBER roles, the owner membership
 * and the default knowledge base — the exact scaffolding the invite/join flow
 * depends on. Returns the new workspace id.
 */
export async function createWorkspace(
    app: INestApplication,
    base: string,
    token: string,
    name: string
): Promise<string> {
    const res = await http(app)
        .post(`${wsBase(base)}/create`)
        .set('Authorization', `Bearer ${token}`)
        .field('name', name);

    if (res.status >= 300) {
        throw new Error(
            `createWorkspace failed: ${res.status} ${JSON.stringify(res.body)}`
        );
    }

    return res.body.data.id;
}

/**
 * Returns an invitable (non-owner) role id for the workspace, used to invite
 * members with a concrete WORKSPACE_MEMBER role.
 */
export async function getInvitableRoleId(
    app: INestApplication,
    base: string,
    token: string,
    workspaceId: string
): Promise<string> {
    const res = await http(app)
        .get(`${wsBase(base)}/${workspaceId}/role/available-for-invitation`)
        .set('Authorization', `Bearer ${token}`);

    if (res.status >= 300 || !res.body.data?.length) {
        throw new Error(
            `no invitable role for ${workspaceId}: ${res.status} ${JSON.stringify(res.body)}`
        );
    }

    return res.body.data[0].id;
}

/**
 * Extracts the raw invitation JWT from an invitation link WITHOUT any email.
 * The link is `${origin}/join?tokens=<JWT>` (note the plural `tokens` query key
 * produced by the server), while the join endpoint reads it as `?token=` — so
 * callers pass the extracted value under `token`.
 */
/**
 * Decodes the workspaceId embedded in the invitation JWT payload. The invite
 * endpoint resolves the target workspace via findWorkspaceByOwner (it ignores
 * the :workspace path param), so tests must follow the workspace the token
 * actually points at rather than the one they created.
 */
export function decodeInvitationWorkspaceId(token: string): string {
    const [, payload] = token.split('.');
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return json.workspaceId;
}

export function extractInvitationToken(invitationLink: string): string {
    const url = new URL(invitationLink);
    const token =
        url.searchParams.get('tokens') ?? url.searchParams.get('token');
    if (!token) {
        throw new Error(`no token in invitation link: ${invitationLink}`);
    }
    return token;
}
