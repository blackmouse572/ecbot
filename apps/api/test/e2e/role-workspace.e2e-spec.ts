import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Workspace-scoped role (permission) CRUD + owner authorization, over HTTP.
// Requires Postgres + Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — workspace role (permission) management', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let strangerToken: string;
    let workspaceId: string;

    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const validPermissions = [{ subject: 'CHATBOT', action: ['read'] }];

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        strangerToken = await login(ctx.app, ctx.base, SEED_USERS.business);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `role-${Date.now()}`
        );
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('lists workspace roles (owner + default member roles exist)', async () => {
        const res = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/${workspaceId}/role/list`)
            .set(...auth(ownerToken));

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('runs a full create → update → inactive → active → delete lifecycle', async () => {
        const name = `qa-role-${Date.now()}`;

        const created = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/${workspaceId}/role/create`)
            .set(...auth(ownerToken))
            .send({
                name,
                description: 'QA role',
                permissions: validPermissions,
            });
        if (created.status >= 300) {
            throw new Error(
                `role create failed: ${created.status} ${JSON.stringify(created.body)}`
            );
        }
        const roleId = created.body.data.id;

        const updated = await http(ctx.app)
            .put(`${wsBase(ctx.base)}/${workspaceId}/role/update/${roleId}`)
            .set(...auth(ownerToken))
            .send({ description: 'Updated', permissions: validPermissions });
        expect(updated.status).toBeLessThan(300);

        const inactive = await http(ctx.app)
            .patch(
                `${wsBase(ctx.base)}/${workspaceId}/role/update/${roleId}/inactive`
            )
            .set(...auth(ownerToken));
        expect(inactive.status).toBeLessThan(300);

        const active = await http(ctx.app)
            .patch(
                `${wsBase(ctx.base)}/${workspaceId}/role/update/${roleId}/active`
            )
            .set(...auth(ownerToken));
        expect(active.status).toBeLessThan(300);

        const deleted = await http(ctx.app)
            .delete(`${wsBase(ctx.base)}/${workspaceId}/role/delete/${roleId}`)
            .set(...auth(ownerToken));
        expect(deleted.status).toBeLessThan(300);
    });

    it('rejects a role permission subject outside the allowed workspace set', async () => {
        const res = await http(ctx.app)
            .post(`${wsBase(ctx.base)}/${workspaceId}/role/create`)
            .set(...auth(ownerToken))
            .send({
                name: `bad-${Date.now()}`,
                description: 'x',
                permissions: [{ subject: 'AUTH', action: ['read'] }],
            });

        expect(res.status).toBe(409);
    });

    it('denies role access to a non-owner of the workspace', async () => {
        const res = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/${workspaceId}/role/list`)
            .set(...auth(strangerToken));

        // A non-owner must be denied with a 4xx (the guard stack may answer
        // 400/401/403/404 depending on which check trips first).
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
    });
});
