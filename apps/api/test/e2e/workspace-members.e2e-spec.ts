import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import {
    createWorkspace,
    getInvitableRoleId,
    wsBase,
} from './utils/workspace.helper';

// Member roster + role-assignment endpoints (workspace/member/*) over HTTP.
// Requires Postgres + Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — workspace members', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let strangerToken: string;
    let workspaceId: string;
    let membershipId: string;
    let roleId: string;

    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        strangerToken = await login(ctx.app, ctx.base, SEED_USERS.business);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `mem-${Date.now()}`
        );
        roleId = await getInvitableRoleId(
            ctx.app,
            ctx.base,
            ownerToken,
            workspaceId
        );

        const members = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/member/${workspaceId}/members`)
            .set(...auth(ownerToken));
        membershipId = members.body.data[0].id;
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('lists members (owner is auto-enrolled)', async () => {
        const res = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/member/${workspaceId}/members`)
            .set(...auth(ownerToken));

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('lists invitable users', async () => {
        const res = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/member/${workspaceId}/invitable`)
            .set(...auth(ownerToken));

        expect(res.status).toBe(200);
    });

    it('reads a member detail by membership id', async () => {
        const res = await http(ctx.app)
            .get(
                `${wsBase(ctx.base)}/member/${workspaceId}/members/${membershipId}`
            )
            .set(...auth(ownerToken));

        expect(res.status).toBe(200);
    });

    it('assigns a workspace role to a member', async () => {
        const res = await http(ctx.app)
            .post(
                `${wsBase(ctx.base)}/member/${workspaceId}/member/${membershipId}/role/${roleId}`
            )
            .set(...auth(ownerToken));

        expect(res.status).toBeLessThan(300);
    });

    it('returns 404 for a non-existent member', async () => {
        const res = await http(ctx.app)
            .get(
                `${wsBase(ctx.base)}/member/${workspaceId}/members/00000000-0000-0000-0000-000000000000`
            )
            .set(...auth(ownerToken));

        expect(res.status).toBe(404);
    });

    it('denies member management to a non-owner', async () => {
        const res = await http(ctx.app)
            .delete(
                `${wsBase(ctx.base)}/member/${workspaceId}/members/${membershipId}`
            )
            .set(...auth(strangerToken));

        // A non-owner must be denied with a 4xx (which specific code depends on
        // which guard trips first).
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
    });
});
