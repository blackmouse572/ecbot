import { EntityManager, RequestContext } from '@mikro-orm/postgresql';
import request from 'supertest';
import { ENUM_API_KEY_TYPE } from '@app/modules/api-key/enums/api-key.enum';
import { ApiKeyService } from '@app/modules/api-key/services/api-key.service';
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

        // The counts are opt-in: the plain list backs the order form selects.
        const plain = await http(ctx.app)
            .get(`${groupsUrl()}?search=Serum`)
            .set(...auth(ownerToken));
        expect(plain.status).toBe(200);
        const plainSerum = plain.body.data.find((g: any) => g.id === groupId);
        expect(plainSerum.confirmedOrders).toBeUndefined();
        expect(plainSerum.learnedRepurchaseDays).toBe(30);

        const list = await http(ctx.app)
            .get(`${groupsUrl()}?search=Serum&withStats=true`)
            .set(...auth(ownerToken));
        expect(list.status).toBe(200);
        const serum = list.body.data.find((g: any) => g.id === groupId);
        expect(serum.learnedRepurchaseDays).toBe(30);
        expect(serum.repurchaseDays).toBe(30);
        expect(serum.confirmedOrders).toBe(6);
        expect(serum.customers).toBe(1);
        expect(serum.repurchasePairs).toBe(5);

        // One more order holding two items of the group: the filter must
        // count and page orders, not item rows.
        const twoItems = await http(ctx.app)
            .post(ordersUrl())
            .set(...auth(ownerToken))
            .send({
                customerId,
                items: [
                    { name: 'Serum B5', productGroupId: groupId, quantity: 1 },
                    { name: 'Serum C', productGroupId: groupId, quantity: 1 },
                ],
            });
        expect(twoItems.status).toBe(201);

        const page1 = await http(ctx.app)
            .get(`${ordersUrl()}?productGroup=${groupId}&perPage=4`)
            .set(...auth(ownerToken));
        expect(page1.status).toBe(200);
        expect(page1.body.data).toHaveLength(4);
        expect(page1.body._metadata.pagination.total).toBe(7);
        const page2 = await http(ctx.app)
            .get(`${ordersUrl()}?productGroup=${groupId}&perPage=4&page=2`)
            .set(...auth(ownerToken));
        expect(page2.body.data).toHaveLength(3);
        const ids = [...page1.body.data, ...page2.body.data].map(
            (o: any) => o.id
        );
        expect(new Set(ids).size).toBe(7);
    });

    it("sums a customer's confirmed orders", async () => {
        // The orders above: six of 300.000 and one of two items without a price.
        const res = await http(ctx.app)
            .get(`${ordersUrl()}/summary?customer=${customerId}`)
            .set(...auth(ownerToken));
        expect(res.status).toBe(200);
        expect(res.body.data.confirmedOrders).toBe(7);
        expect(res.body.data.totalSpent).toBe(1_800_000);
        expect(new Date(res.body.data.lastOrderedAt).getTime()).toBeGreaterThan(
            Date.now() - 60_000
        );

        const stranger = await http(ctx.app)
            .get(`${ordersUrl()}/summary?customer=${customerId}`)
            .set(...auth(strangerToken));
        expect(stranger.status).toBeGreaterThanOrEqual(403);
        expect(stranger.status).toBeLessThan(500);

        const missing = await http(ctx.app)
            .get(`${ordersUrl()}/summary`)
            .set(...auth(ownerToken));
        expect(missing.status).toBe(422);
    });

    it('does not learn a 0-day cycle from orders on the same day', async () => {
        const group = await http(ctx.app)
            .post(groupsUrl())
            .set(...auth(ownerToken))
            .send({ name: 'Mặt nạ ngủ', defaultRepurchaseDays: 40 });
        const groupId = group.body.data.id;
        const orderedAt = new Date().toISOString();
        for (let i = 0; i < 6; i++) {
            const res = await http(ctx.app)
                .post(ordersUrl())
                .set(...auth(ownerToken))
                .send({
                    customerId,
                    orderedAt,
                    items: [
                        {
                            name: 'Mặt nạ',
                            productGroupId: groupId,
                            quantity: 1,
                        },
                    ],
                });
            expect(res.status).toBe(201);
        }

        const list = await http(ctx.app)
            .get(
                `${groupsUrl()}?search=${encodeURIComponent('Mặt nạ')}&withStats=true`
            )
            .set(...auth(ownerToken));
        const mask = list.body.data.find((g: any) => g.id === groupId);
        expect(mask.learnedRepurchaseDays ?? null).toBeNull();
        expect(mask.repurchaseDays).toBe(40);
        expect(mask.confirmedOrders).toBe(6);
        expect(mask.repurchasePairs).toBe(0);
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

    it('previews a CSV import, imports it, and skips it the second time', async () => {
        const code = `SP-${Date.now()}`;
        const rows = [
            {
                code,
                phone: '+84 901 234 567',
                item: 'Serum B5',
                group: 'serum',
                quantity: 1,
                unitPrice: '200.000',
                orderedAt: '02/10/2026',
            },
            {
                code,
                phone: '0901234567',
                item: 'Bông tẩy trang',
                group: 'Phụ kiện',
            },
            { phone: '0988777666', name: 'Anh Minh', total: 450000 },
            { code: 'NO-PHONE', item: 'Serum' },
            {
                code: 'BAD-PRICE',
                phone: '0988777666',
                item: 'Serum',
                unitPrice: '12,5',
            },
        ];
        const importUrl = `${ordersUrl()}/import`;

        const preview = await http(ctx.app)
            .post(importUrl)
            .set(...auth(ownerToken))
            .send({ rows, dryRun: true });
        expect(preview.status).toBe(200);
        expect(preview.body.data).toEqual({
            dryRun: true,
            orders: 2,
            skipped: 0,
            newCustomers: 1,
            newGroups: ['Phụ kiện'],
            invalidRows: [
                { row: 4, reason: 'missingPhone' },
                { row: 5, reason: 'badNumber' },
            ],
        });

        const imported = await http(ctx.app)
            .post(importUrl)
            .set(...auth(ownerToken))
            .send({ rows });
        expect(imported.status).toBe(200);
        expect(imported.body.data.orders).toBe(2);

        const list = await http(ctx.app)
            .get(`${ordersUrl()}?search=${code}`)
            .set(...auth(ownerToken));
        const order = list.body.data.find((o: any) => o.code === code);
        expect(order.customerId).toBe(customerId);
        expect(order.source).toBe('IMPORT');
        expect(order.status).toBe('CONFIRMED');
        expect(order.orderedAt).toBe('2026-10-02T00:00:00.000Z');
        expect(order.total).toBe(200000);
        expect(order.items.map((i: any) => i.productGroupName)).toEqual([
            'Serum',
            'Phụ kiện',
        ]);

        const again = await http(ctx.app)
            .post(importUrl)
            .set(...auth(ownerToken))
            .send({ rows: rows.slice(0, 2) });
        expect(again.body.data).toMatchObject({ orders: 0, skipped: 1 });
    });

    it('lets the bot note a chat order as a pending draft, replaced on the next note', async () => {
        // The bot calls with a SYSTEM key; mint one for this run.
        const system = await RequestContext.create(
            ctx.app.get(EntityManager).fork(),
            () =>
                ctx.app.get(ApiKeyService).create({
                    name: `e2e-system-${Date.now()}`,
                    type: ENUM_API_KEY_TYPE.SYSTEM,
                } as any)
        );
        const draftUrl = `${ctx.base}/system/customers/${customerId}/orders/draft`;
        const asBot = () =>
            request(ctx.app.getHttpServer())
                .post(draftUrl)
                .set('x-api-key', `${system.key}:${system.secret}`);
        const conversationId = '0b8f6f0e-6c1a-4d5e-9c43-2a7f3f1d9b11';

        const denied = await http(ctx.app)
            .post(draftUrl)
            .send({ items: [{ name: 'Serum', quantity: 1 }] });
        // A DEFAULT key is refused by the key type guard.
        expect(denied.status).toBeGreaterThanOrEqual(400);
        expect(denied.status).toBeLessThan(500);

        const first = await asBot().send({
            conversationId,
            items: [{ name: 'Serum B5 30ml', quantity: 1, unitPrice: 150000 }],
        });
        expect(first.status).toBe(201);
        expect(first.body.data.status).toBe('PENDING');
        expect(first.body.data.source).toBe('CHAT');
        expect(first.body.data.items[0].productGroupName).toBe('Serum');

        const second = await asBot().send({
            conversationId,
            items: [{ name: 'Serum B5 30ml', quantity: 2, unitPrice: 150000 }],
            note: 'Giao sau 18h',
        });
        expect(second.body.data.id).toBe(first.body.data.id);
        expect(second.body.data.total).toBe(300000);
        expect(second.body.data.note).toBe('Giao sau 18h');
    });
});
