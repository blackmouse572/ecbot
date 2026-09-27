import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import {
    createWorkspace,
    decodeInvitationWorkspaceId,
    extractInvitationToken,
    wsBase,
} from './utils/workspace.helper';

const ORIGIN = 'https://app.example.com';

// Invitation management endpoints (/:workspace/invitations/*) over HTTP.
// Requires Postgres + Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — workspace invitation management', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let workspaceId: string;
    let otherWorkspaceId: string;

    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `invm-${Date.now()}`
        );
        otherWorkspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `invo-${Date.now()}`
        );
    });

    afterAll(async () => {
        await ctx?.close();
    });

    // The invite endpoint always targets the :workspace path param
    // (workspaceId here); decode the token's workspaceId as a sanity check
    // and to manage the invitation via the same workspace.
    async function inviteAndGet(
        email: string
    ): Promise<{ id: string; ws: string }> {
        // No roleId: the default member role is assigned instead — irrelevant
        // to invitation management.
        const inv = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/invite-member/${workspaceId}`)
            .set(...auth(ownerToken))
            .set('Origin', ORIGIN)
            .send({ invitedEmail: email });
        const token = extractInvitationToken(inv.body.data.invitationLink);
        const ws = decodeInvitationWorkspaceId(token);

        const list = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/${ws}/invitations/list`)
            .set(...auth(ownerToken));
        const found = list.body.data.find((i: any) => i.inviteeEmail === email);
        return { id: found.id, ws };
    }

    it('lists and reads an invitation detail', async () => {
        const { id, ws } = await inviteAndGet(SEED_USERS.business);

        const detail = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/${ws}/invitations/${id}`)
            .set(...auth(ownerToken));

        expect(detail.status).toBe(200);
        // The detail DTO does not reliably expose the id, so assert on a field
        // that maps cleanly: the invitee email of the invitation we created.
        expect(detail.body.data.inviteeEmail).toBe(SEED_USERS.business);
    });

    it('regenerates then revokes a pending invitation', async () => {
        const { id, ws } = await inviteAndGet(SEED_USERS.admin);

        const regen = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/${ws}/invitations/${id}/regenerate`)
            .set(...auth(ownerToken));
        expect(regen.status).toBeLessThan(300);

        const revoke = await http(ctx.app)
            .delete(`${wsBase(ctx.base)}/${ws}/invitations/${id}`)
            .set(...auth(ownerToken));
        expect(revoke.status).toBeLessThan(300);

        // A revoked (non-PENDING) invitation can no longer be revoked again
        const revokeAgain = await http(ctx.app)
            .delete(`${wsBase(ctx.base)}/${ws}/invitations/${id}`)
            .set(...auth(ownerToken));
        expect(revokeAgain.status).toBe(409);
    });

    it('isolates invitations across workspaces (404 from the wrong workspace)', async () => {
        const { id, ws } = await inviteAndGet(SEED_USERS.premium);
        // Query the invitation from a different workspace the owner also owns.
        const wrongWs = ws === workspaceId ? otherWorkspaceId : workspaceId;

        const res = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/${wrongWs}/invitations/${id}`)
            .set(...auth(ownerToken));

        expect(res.status).toBe(404);
    });
});
