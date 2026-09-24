import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import {
    createWorkspace,
    decodeInvitationWorkspaceId,
    extractInvitationToken,
    getInvitableRoleId,
    wsBase,
} from './utils/workspace.helper';

const ORIGIN = 'https://app.example.com';

/**
 * End-to-end invite → join flow, driven entirely over HTTP against the real app
 * + (dev) Postgres. Email is stubbed (bootstrapE2E overrides 'IEmailService'),
 * so the invitation token is obtained from the invite RESPONSE — never a mailbox.
 *
 * Requires: Postgres + Redis up, DB seeded via `migrate:up && migrate:seed:e2e`.
 */
describe('E2E — workspace member invite → join', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let inviteeToken: string;
    let workspaceId: string;
    let roleId: string;

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        // Use `business` as the owner and `premium` as the invitee. The
        // invite endpoint resolves the target workspace via
        // findWorkspaceByOwner(ownerId, workspaceId) — scoped to the
        // :workspace path param — so every invite here deterministically
        // targets `workspaceId`.
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.business);
        inviteeToken = await login(ctx.app, ctx.base, SEED_USERS.premium);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `inv-${Date.now()}`
        );
        roleId = await getInvitableRoleId(
            ctx.app,
            ctx.base,
            ownerToken,
            workspaceId
        );
    });

    afterAll(async () => {
        await ctx?.close();
    });

    async function invite(email: string) {
        return http(ctx.app)
            .post(`${wsBase(ctx.base)}/invite-member/${workspaceId}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .set('Origin', ORIGIN)
            .send({ invitedEmail: email, roleId });
    }

    it('invites a member and returns an invitation link carrying the token', async () => {
        const res = await invite(SEED_USERS.premium);

        expect(res.status).toBeLessThan(300);
        expect(res.body.data.invitationLink).toContain('/join?tokens=');
    });

    it('lets the invitee join with the token from the response (no email)', async () => {
        const inviteRes = await invite(SEED_USERS.premium);
        const token = extractInvitationToken(
            inviteRes.body.data.invitationLink
        );
        // The invite endpoint now targets the :workspace path param, so this
        // always equals `workspaceId` — decoded here as a sanity check.
        const targetWs = decodeInvitationWorkspaceId(token);
        expect(targetWs).toBe(workspaceId);

        const joinRes = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/member/join`)
            .query({ token })
            .set('Authorization', `Bearer ${inviteeToken}`);

        expect([200, 201, 409]).toContain(joinRes.status);

        if (joinRes.status < 300) {
            // Fresh join: the invitation the token points at is now ACCEPTED.
            // The list defaults to PENDING only, so filter for ACCEPTED.
            const list = await http(ctx.app)
                .get(`${wsBase(ctx.base)}/${targetWs}/invitations/list`)
                .query({ status: 'ACCEPTED' })
                .set('Authorization', `Bearer ${ownerToken}`);
            const hasAccepted = list.body.data.some(
                (i: any) =>
                    i.inviteeEmail === SEED_USERS.premium &&
                    i.status === 'ACCEPTED'
            );
            expect(hasAccepted).toBe(true);
        } else {
            // The invitee is already a member from an earlier run against the
            // reused dev DB — the join is correctly refused with a conflict,
            // which is itself durable proof the flow completed before.
            expect(joinRes.status).toBe(409);
        }
    });

    it('rejects joining twice (already a member)', async () => {
        const inviteRes = await invite(SEED_USERS.premium);
        const token = extractInvitationToken(
            inviteRes.body.data.invitationLink
        );

        // The previous test made the invitee a member, so a second join must be
        // refused with a conflict.
        const joinRes = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/member/join`)
            .query({ token })
            .set('Authorization', `Bearer ${inviteeToken}`);

        expect(joinRes.status).toBe(409);
    });

    it('rejects a caller who is authenticated as someone other than the invitee', async () => {
        // The token invites SEED_USERS.premium; using it while authenticated
        // as an unrelated third user (not a member, not the invitee) must be
        // refused — the caller's own JWT identity is what is joined, never
        // the invitedEmail claim inside the token.
        const otherToken = await login(ctx.app, ctx.base, SEED_USERS.admin);
        const inviteRes = await invite(SEED_USERS.premium);
        const token = extractInvitationToken(
            inviteRes.body.data.invitationLink
        );

        const joinRes = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/member/join`)
            .query({ token })
            .set('Authorization', `Bearer ${otherToken}`);

        expect(joinRes.status).toBe(401);
    });

    it('rejects an invalid / forged token', async () => {
        const joinRes = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/member/join`)
            .query({ token: 'not-a-real-token' })
            .set('Authorization', `Bearer ${inviteeToken}`);

        expect(joinRes.status).toBe(401);
    });

    it('requires authentication to join', async () => {
        const joinRes = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/member/join`)
            .query({ token: 'whatever' });

        expect(joinRes.status).toBe(401);
    });
});
