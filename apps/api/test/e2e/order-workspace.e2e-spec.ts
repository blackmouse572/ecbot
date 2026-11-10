import { EntityManager } from '@mikro-orm/postgresql';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Orders and product groups over HTTP: manual orders, a chat-style draft that
// is confirmed later, the learned repurchase cycle and workspace isolation.
// Requires Postgres + Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — workspace orders and product groups', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let strangerToken: string;
    let workspaceId: string;
    let customerId: string;

    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const ordersUrl = () => `${wsBase(ctx.base)}/${workspaceId}/orders`;
    const groupsUrl = () => `${wsBase(ctx.base)}/${workspaceId}/product-groups`;

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        strangerToken = await login(ctx.app, ctx.base, SEED_USERS.business);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `orders-${Date.now()}`
        );

        // Customers arrive through channels; no API creates one, so seed it.
        const em = ctx.app.get(EntityManager).fork();
        const customer = em.create(CustomerEntity, {
            workspace: em.getReference(WorkspaceEntity, workspaceId),
            name: 'Chị Lan',
            phone: '0901234567',
        });
        await em.persistAndFlush(customer);
        customerId = customer.id;
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('creates product groups and rejects a duplicate name', async () => {
        const created = await http(ctx.app)
            .post(groupsUrl())
            .set(...auth(ownerToken))
            .send({ name: 'Kem chống nắng', defaultRepurchaseDays: 45 });
        expect(created.status).toBe(201);
        expect(created.body.data.repurchaseDays).toBe(45);

        const duplicate = await http(ctx.app)
            .post(groupsUrl())
            .set(...auth(ownerToken))
            .send({ name: 'Kem chống nắng' });
        expect(duplicate.status).toBe(409);
    });

    it('adds a manual order as confirmed and learns the cycle after 5 pairs', async () => {
        const group = await http(ctx.app)
            .post(groupsUrl())
            .set(...auth(ownerToken))
            .send({ name: 'Serum', defaultRepurchaseDays: 60 });
        const groupId = group.body.data.id;

        const day = 86_400_000;
        for (const daysAgo of [150, 120, 90, 60, 30, 0]) {
            const res = await http(ctx.app)
                .post(ordersUrl())
                .set(...auth(ownerToken))
                .send({
                    customerId,
                    orderedAt: new Date(
                        Date.now() - daysAgo * day
                    ).toISOString(),
                    items: [
                        {
                            name: 'Serum B5',
                            productGroupId: groupId,
                            quantity: 2,
                            unitPrice: 150000,
                        },
                    ],
                });
            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe('CONFIRMED');
            expect(res.body.data.source).toBe('MANUAL');
            expect(res.body.data.total).toBe(300000);
            expect(res.body.data.code).toMatch(/^DH-\d{6}-[A-Z0-9]{4}$/);
        }

        const list = await http(ctx.app)
            .get(`${groupsUrl()}?search=Serum`)
            .set(...auth(ownerToken));
        expect(list.status).toBe(200);
        const serum = list.body.data.find((g: any) => g.id === groupId);
        expect(serum.learnedRepurchaseDays).toBe(30);
        expect(serum.repurchaseDays).toBe(30);

        const filtered = await http(ctx.app)
            .get(`${ordersUrl()}?productGroup=${groupId}&perPage=4`)
            .set(...auth(ownerToken));
        expect(filtered.status).toBe(200);
        expect(filtered.body.data).toHaveLength(4);
        expect(filtered.body._metadata.pagination.total).toBe(6);
    });

    it('confirms a pending draft once, then cancels it', async () => {
        const draft = await http(ctx.app)
            .post(ordersUrl())
            .set(...auth(ownerToken))
            .send({
                customerId,
                status: 'PENDING',
                code: `CHAT-${Date.now()}`,
                items: [{ name: 'Son dưỡng', quantity: 1, unitPrice: 90000 }],
            });
        expect(draft.status).toBe(201);
        expect(draft.body.data.status).toBe('PENDING');
        const id = draft.body.data.id;

        const pending = await http(ctx.app)
            .get(`${ordersUrl()}?status=PENDING`)
            .set(...auth(ownerToken));
        expect(pending.body.data.map((o: any) => o.id)).toEqual([id]);

        const confirmed = await http(ctx.app)
            .post(`${ordersUrl()}/${id}/confirm`)
            .set(...auth(ownerToken));
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.status).toBe('CONFIRMED');
        expect(confirmed.body.data.confirmedAt).toBeTruthy();

        const again = await http(ctx.app)
            .post(`${ordersUrl()}/${id}/confirm`)
            .set(...auth(ownerToken));
        expect(again.status).toBe(400);

        const edited = await http(ctx.app)
            .patch(`${ordersUrl()}/${id}`)
            .set(...auth(ownerToken))
            .send({
                items: [{ name: 'Son dưỡng', quantity: 3, unitPrice: 90000 }],
                note: 'Giao buổi chiều',
            });
        expect(edited.status).toBe(200);
        expect(edited.body.data.total).toBe(270000);
        expect(edited.body.data.items).toHaveLength(1);

        const cancelled = await http(ctx.app)
            .post(`${ordersUrl()}/${id}/cancel`)
            .set(...auth(ownerToken));
        expect(cancelled.status).toBe(200);
        expect(cancelled.body.data.status).toBe('CANCELLED');
    });

    it('validates the body and rejects a reused order code', async () => {
        const bad = await http(ctx.app)
            .post(ordersUrl())
            .set(...auth(ownerToken))
            .send({ customerId, items: [{ name: '', quantity: 0 }] });
        expect(bad.status).toBe(422);

        const code = `DUP-${Date.now()}`;
        const first = await http(ctx.app)
            .post(ordersUrl())
            .set(...auth(ownerToken))
            .send({ customerId, code, items: [] });
        expect(first.status).toBe(201);
        const second = await http(ctx.app)
            .post(ordersUrl())
            .set(...auth(ownerToken))
            .send({ customerId, code, items: [] });
        expect(second.status).toBe(409);
    });

    it('keeps other workspaces out', async () => {
        const res = await http(ctx.app)
            .get(ordersUrl())
            .set(...auth(strangerToken));
        expect(res.status).toBeGreaterThanOrEqual(403);
        expect(res.status).toBeLessThan(500);
    });
});
