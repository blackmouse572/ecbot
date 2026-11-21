import { EntityManager } from '@mikro-orm/postgresql';
import { ENUM_ACCOUNT_TYPE as A } from '@app/modules/account/enums/account.enum';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE as S,
    ENUM_CUSTOMER_MARKETING_PERMISSION as P,
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND as K,
} from '@app/modules/customer/enums/customer-marketing.enum';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import { CustomerMarketingStateEntity } from '@app/modules/customer/repository/entities/customer-marketing-state.entity';
import { CustomerProductReactionEntity } from '@app/modules/customer/repository/entities/customer-product-reaction.entity';
import { CustomerTagAssignmentEntity } from '@app/modules/customer/repository/entities/customer-tag-assignment.entity';
import { CustomerTagEntity } from '@app/modules/customer/repository/entities/customer-tag.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { MarketingEventEntity } from '@app/modules/customer/repository/entities/marketing-event.entity';
import { ProductGroupEntity } from '@app/modules/order/repository/entities/product-group.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Audiences (#504) over HTTP, so the condition SQL, the exclusion reasons
// and the channel counts run against real Postgres. Requires Postgres +
// Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — marketing audiences', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let workspaceId: string;
    let serumId: string;
    let vipTagId: string;
    const ids: Record<string, string> = {};

    const day = 86_400_000;
    const ago = (days: number) => new Date(Date.now() - days * day);
    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const url = () => `${wsBase(ctx.base)}/${workspaceId}`;
    const preview = async (body: object) => {
        // Stay under the throttle (10 requests per 0.5 s).
        await new Promise(resolve => setTimeout(resolve, 60));
        return http(ctx.app)
            .post(`${url()}/marketing/audiences/preview`)
            .set(...auth(ownerToken))
            .send(body);
    };
    const all = (...conditions: unknown[]) => ({ match: 'ALL', conditions });
    const reasons = (res: any) =>
        Object.fromEntries(
            res.body.data.excluded.reasons
                .filter((r: any) => r.count > 0)
                .map((r: any) => [r.reason, r.count])
        );

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `audience-${Date.now()}`
        );

        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const suffix = Date.now().toString(36);
        const serum = em.create(ProductGroupEntity, {
            workspace,
            name: `Serum ${suffix}`,
            defaultRepurchaseDays: 30,
        } as ProductGroupEntity);
        const vip = em.create(CustomerTagEntity, {
            workspace,
            name: `Khách quen ${suffix}`,
        } as CustomerTagEntity);
        const customer = (
            name: string,
            platforms: A[],
            state?: Partial<CustomerMarketingStateEntity>
        ) => {
            const c = em.create(CustomerEntity, {
                workspace,
                name,
                createdAt: ago(60),
            } as Partial<CustomerEntity> as CustomerEntity);
            for (const platform of platforms) {
                em.create(ContactPointEntity, {
                    workspace,
                    customer: c,
                    platform,
                    externalSenderId: `${name}-${platform}-${suffix}`,
                });
            }
            if (state) {
                em.create(CustomerMarketingStateEntity, {
                    workspace,
                    customer: c,
                    ...state,
                } as CustomerMarketingStateEntity);
            }
            return c;
        };
        const askedPrice = (c: CustomerEntity, daysAgo: number) =>
            em.create(MarketingEventEntity, {
                workspace,
                customer: c,
                kind: K.INTENT,
                actor: ENUM_MARKETING_EVENT_ACTOR.CLASSIFIER,
                newValue: S.ASKED_PRICE,
                productGroup: serum,
                createdAt: ago(daysAgo),
            } as Partial<MarketingEventEntity> as MarketingEventEntity);

        // Asked the serum price 2 days ago, no order; tagged.
        const lan = customer('Lan', [A.FACEBOOK_PAGE], {
            stage: S.ASKED_PRICE,
            lastInboundAt: ago(2),
        });
        askedPrice(lan, 2);
        em.create(CustomerTagAssignmentEntity, { customer: lan, tag: vip });
        // Wrote on Zalo, nothing else.
        const minh = customer('Minh', [A.ZALO_PAGE]);
        // Bought the serum, then said "dừng".
        const hoa = customer('Hoa', [A.FACEBOOK_PAGE], {
            permission: P.STOPPED,
            lastInboundAt: ago(20),
        });
        // Bought, then paused offers for 10 more days.
        const mai = customer('Mai', [A.FACEBOOK_PAGE], {
            permission: P.PAUSED,
            permissionUntil: new Date(Date.now() + 10 * day),
            lastInboundAt: ago(45),
        });
        // Bought the serum on two channels, then deferred the serum.
        const khanh = customer('Khanh', [A.FACEBOOK_PAGE, A.ZALO_PAGE], {
            lastInboundAt: ago(20),
        });
        em.create(CustomerProductReactionEntity, {
            workspace,
            customer: khanh,
            productGroup: serum,
            until: new Date(Date.now() + 30 * day),
        } as CustomerProductReactionEntity);
        // Asked the serum price 10 days ago, then bought it 5 days ago.
        const tuan = customer('Tuan', [A.FACEBOOK_PAGE], {
            stage: S.ASKED_PRICE,
            lastInboundAt: ago(5),
        });
        askedPrice(tuan, 10);
        // Due to rebuy the serum (27 of 30 days), but deferred it.
        const vy = customer('Vy', [A.INSTAGRAM_ACCOUNT], {
            lastInboundAt: ago(27),
        });
        em.create(CustomerProductReactionEntity, {
            workspace,
            customer: vy,
            productGroup: serum,
            until: new Date(Date.now() + 30 * day),
        } as CustomerProductReactionEntity);
        // Interested and upset.
        const hung = customer('Hung', [A.FACEBOOK_PAGE], {
            stage: S.INTERESTED,
            hostile: true,
            lastInboundAt: ago(3),
        });
        await em.flush();
        serumId = serum.id;
        vipTagId = vip.id;
        Object.assign(ids, {
            lan: lan.id,
            minh: minh.id,
            hoa: hoa.id,
            mai: mai.id,
            khanh: khanh.id,
            tuan: tuan.id,
            hung: hung.id,
            vy: vy.id,
        });

        // Orders go through the API, so the stage and last order follow.
        const order = async (
            customerId: string,
            daysAgo: number,
            unitPrice: number
        ) => {
            const res = await http(ctx.app)
                .post(`${url()}/orders`)
                .set(...auth(ownerToken))
                .send({
                    customerId,
                    orderedAt: ago(daysAgo).toISOString(),
                    items: [
                        {
                            name: 'Serum B5',
                            quantity: 1,
                            unitPrice,
                            productGroupId: serumId,
                        },
                    ],
                });
            expect(res.status).toBe(201);
        };
        await order(hoa.id, 20, 300_000);
        await order(mai.id, 45, 300_000);
        await order(khanh.id, 20, 300_000);
        await order(tuan.id, 5, 300_000);
        await order(tuan.id, 40, 500_000);
        await order(vy.id, 27, 300_000);
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('counts a Việc nên làm preset the way Tổng quan does', async () => {
        const res = await preview({ preset: 'ASKED_PRICE' });
        expect(res.status).toBe(200);
        expect(res.body.data.count).toBe(1);
        expect(res.body.data.channels).toEqual([
            { platform: A.FACEBOOK_PAGE, count: 1 },
        ]);
    });

    it('leaves out who deferred the product group a preset is about, on Tổng quan too', async () => {
        const res = await preview({ preset: 'REPURCHASE' });
        expect(res.body.data.count).toBe(0);
        // Mai is due to rebuy but paused; Vy deferred the serum.
        expect(reasons(res)).toEqual({ PAUSED: 1, DEFERRED: 1 });

        const overview = await http(ctx.app)
            .get(`${url()}/marketing/overview`)
            .set(...auth(ownerToken));
        const row = overview.body.data.todos.find(
            (t: any) => t.key === 'REPURCHASE'
        );
        expect(row).toEqual({ key: 'REPURCHASE', count: 0, excluded: 2 });
    });

    it('leaves out who must not get offers, one reason each', async () => {
        const res = await preview(
            all({ field: 'STAGE', operator: 'IN', values: [S.BOUGHT_ONCE] })
        );
        expect(res.status).toBe(200);
        // Khanh and Vy bought once; Tuan bought twice, so Mua lại.
        expect(res.body.data.count).toBe(2);
        expect(reasons(res)).toEqual({ STOPPED: 1, PAUSED: 1 });
        expect(res.body.data.excluded.total).toBe(2);
    });

    it('leaves out who deferred a product group the audience is about', async () => {
        const res = await preview(
            all({
                field: 'PRODUCT_GROUP_BOUGHT',
                operator: 'IN',
                values: [serumId],
            })
        );
        expect(res.body.data.count).toBe(1); // Tuan
        expect(reasons(res)).toEqual({
            STOPPED: 1,
            PAUSED: 1,
            DEFERRED: 2, // Khanh, Vy
        });
    });

    it('matches any condition, counting each channel a customer can be reached on', async () => {
        const res = await preview({
            match: 'ANY',
            conditions: [
                { field: 'CHANNEL', operator: 'IN', values: [A.ZALO_PAGE] },
                { field: 'LABEL', operator: 'IN', values: [vipTagId] },
            ],
        });
        // Minh and Khanh on Zalo, Lan tagged.
        expect(res.body.data.count).toBe(3);
        expect(res.body.data.channels).toEqual([
            { platform: A.FACEBOOK_PAGE, count: 2 },
            { platform: A.ZALO_PAGE, count: 2 },
        ]);
    });

    it('tells who ordered after their last price question', async () => {
        const not = await preview(
            all({ field: 'ORDERED_AFTER_PRICE', operator: 'NO' })
        );
        expect(not.body.data.count).toBe(1); // Lan
        const did = await preview(
            all({ field: 'ORDERED_AFTER_PRICE', operator: 'YES' })
        );
        expect(did.body.data.count).toBe(1); // Tuan
    });

    it('filters by last message, order count and spend together', async () => {
        const recent = await preview(
            all({ field: 'LAST_MESSAGE', operator: 'WITHIN_DAYS', number: 7 })
        );
        expect(recent.body.data.count).toBe(2); // Lan, Tuan
        expect(reasons(recent)).toEqual({ HOSTILE: 1 }); // Hung

        const big = await preview(
            all(
                { field: 'ORDER_COUNT', operator: 'AT_LEAST', number: 2 },
                { field: 'TOTAL_SPEND', operator: 'AT_LEAST', number: 800_000 }
            )
        );
        expect(big.body.data.count).toBe(1); // Tuan
    });

    it('matches the opposite of a condition', async () => {
        const count = async (condition: object) =>
            (await preview(all(condition))).body.data;

        // Minh on Zalo, Vy on Instagram; Khanh is on Facebook too.
        expect(
            await count({
                field: 'CHANNEL',
                operator: 'NOT_IN',
                values: [A.FACEBOOK_PAGE],
            })
        ).toMatchObject({ count: 2, excluded: { total: 0 } });
        // Everyone but Lan: Minh, Khanh, Tuan, Vy; Hoa, Mai, Hung left out.
        expect(
            await count({
                field: 'LABEL',
                operator: 'NOT_IN',
                values: [vipTagId],
            })
        ).toMatchObject({ count: 4, excluded: { total: 3 } });
        // Lan and Minh; Hung is upset.
        const notBought = await preview(
            all({
                field: 'STAGE',
                operator: 'NOT_IN',
                values: [S.BOUGHT_ONCE, S.BOUGHT_REPEAT],
            })
        );
        expect(notBought.body.data.count).toBe(2);
        expect(reasons(notBought)).toEqual({ HOSTILE: 1 });
        // No orders: Lan and Minh; Hung is upset.
        const noOrders = await preview(
            all({ field: 'ORDER_COUNT', operator: 'AT_MOST', number: 0 })
        );
        expect(noOrders.body.data.count).toBe(2);
        expect(reasons(noOrders)).toEqual({ HOSTILE: 1 });
        // Minh never wrote after arriving 60 days ago; Mai is paused.
        const quiet = await preview(
            all({
                field: 'LAST_MESSAGE',
                operator: 'OLDER_THAN_DAYS',
                number: 30,
            })
        );
        expect(quiet.body.data.count).toBe(1);
        expect(reasons(quiet)).toEqual({ PAUSED: 1 });
    });

    it('finds who asked about a product group', async () => {
        const res = await preview(
            all({
                field: 'PRODUCT_GROUP_ASKED',
                operator: 'IN',
                values: [serumId],
            })
        );
        expect(res.body.data.count).toBe(2); // Lan, Tuan
        expect(res.body.data.excluded.total).toBe(0);
    });

    it('lists the customers it would reach, page by page', async () => {
        const res = await http(ctx.app)
            .post(`${url()}/marketing/audiences/customers?perPage=1`)
            .set(...auth(ownerToken))
            .send(
                all({
                    field: 'CHANNEL',
                    operator: 'IN',
                    values: [A.FACEBOOK_PAGE],
                })
            );
        expect(res.status).toBe(200);
        // Lan, Khanh, Tuan; Hoa, Mai and Hung are left out. Latest message first.
        expect(res.body._metadata.pagination.total).toBe(3);
        expect(res.body.data.map((c: any) => c.id)).toEqual([ids.lan]);
    });

    it('rejects a condition that does not fit its field', async () => {
        const res = await preview(
            all({ field: 'STAGE', operator: 'AT_LEAST', number: 2 })
        );
        expect(res.status).toBe(400);
        const both = await preview({
            preset: 'NEW',
            ...all({ field: 'STAGE', operator: 'IN', values: [S.NEW] }),
        });
        expect(both.status).toBe(400);
    });
});
