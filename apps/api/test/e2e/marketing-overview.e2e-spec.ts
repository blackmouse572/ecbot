import { EntityManager } from '@mikro-orm/postgresql';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE as S,
    ENUM_CUSTOMER_MARKETING_PERMISSION as P,
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND as K,
} from '@app/modules/customer/enums/customer-marketing.enum';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import { CustomerMarketingStateEntity } from '@app/modules/customer/repository/entities/customer-marketing-state.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { MarketingEventEntity } from '@app/modules/customer/repository/entities/marketing-event.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Tổng quan over HTTP, so the raw SQL behind it (the week-ago stage, the
// funnel LATERAL, the todo FILTERs and the repurchase join) runs against
// real Postgres. Requires Postgres + Redis up and the DB seeded
// (migrate:up && migrate:seed:e2e).
describe('E2E — marketing overview', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let workspaceId: string;
    let overview: any;

    const day = 86_400_000;
    const ago = (days: number) => new Date(Date.now() - days * day);
    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const url = () => `${wsBase(ctx.base)}/${workspaceId}`;

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `overview-${Date.now()}`
        );

        // Customers arrive through channels and the classifier writes their
        // stages; no API does either, so seed them.
        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const suffix = Date.now().toString(36);
        const customer = (
            name: string,
            createdDaysAgo: number,
            platform: ENUM_ACCOUNT_TYPE,
            state?: Partial<CustomerMarketingStateEntity>
        ) => {
            const c = em.create(CustomerEntity, {
                workspace,
                name,
                createdAt: ago(createdDaysAgo),
            } as Partial<CustomerEntity> as CustomerEntity);
            em.create(ContactPointEntity, {
                workspace,
                customer: c,
                platform,
                externalSenderId: `${name}-${suffix}`,
            });
            if (state) {
                em.create(CustomerMarketingStateEntity, {
                    workspace,
                    customer: c,
                    ...state,
                } as CustomerMarketingStateEntity);
            }
            return c;
        };
        const event = (
            c: CustomerEntity,
            kind: K,
            daysAgo: number,
            oldValue: string | null,
            newValue: string
        ) =>
            em.create(MarketingEventEntity, {
                workspace,
                customer: c,
                kind,
                actor: ENUM_MARKETING_EVENT_ACTOR.CLASSIFIER,
                oldValue,
                newValue,
                createdAt: ago(daysAgo),
            } as Partial<MarketingEventEntity> as MarketingEventEntity);

        // Quan tâm a week ago, asked the price 2 days ago.
        const lan = customer('Lan', 20, ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
            stage: S.ASKED_PRICE,
            lastInboundAt: ago(2),
        });
        event(lan, K.STAGE, 3, S.INTERESTED, S.ASKED_PRICE);
        event(lan, K.INTENT, 2, null, S.ASKED_PRICE);
        // Wrote for the first time this week, no state row yet.
        customer('Minh', 2, ENUM_ACCOUNT_TYPE.ZALO_PAGE);
        // Bought 20 days ago, then said "dừng" 5 days ago.
        const hoa = customer('Hoa', 40, ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
            stage: S.BOUGHT_ONCE,
            permission: P.STOPPED,
            lastInboundAt: ago(20),
            lastOrderAt: ago(20),
        });
        event(hoa, K.PERMISSION, 5, P.PENDING, P.STOPPED);
        // Nothing for 150 days: Lâu không nhắn.
        customer('Tuan', 200, ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
            stage: S.BOUGHT_REPEAT,
            lastInboundAt: ago(150),
            lastOrderAt: ago(150),
        });
        // Bought 45 days ago, then paused offers for 10 more days.
        customer('Mai', 100, ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
            stage: S.BOUGHT_ONCE,
            permission: P.PAUSED,
            permissionUntil: new Date(Date.now() + 10 * day),
            lastInboundAt: ago(45),
            lastOrderAt: ago(45),
        });
        // Deleted customers are not counted.
        customer('Deleted', 30, ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
            stage: S.ASKED_PRICE,
        }).deletedAt = new Date();
        const thu = customer('Thu', 60, ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE);
        await em.flush();

        // Thu bought a 30-day product 27 days ago, through the API, so the
        // order confirms and writes Đã mua 1 lần and the last order time.
        const group = await http(ctx.app)
            .post(`${url()}/product-groups`)
            .set(...auth(ownerToken))
            .send({ name: `Serum ${suffix}`, defaultRepurchaseDays: 30 });
        expect(group.status).toBe(201);
        const order = await http(ctx.app)
            .post(`${url()}/orders`)
            .set(...auth(ownerToken))
            .send({
                customerId: thu.id,
                orderedAt: ago(27).toISOString(),
                items: [
                    {
                        name: 'Serum B5',
                        quantity: 1,
                        productGroupId: group.body.data.id,
                    },
                ],
            });
        expect(order.status).toBe(201);

        const res = await http(ctx.app)
            .get(`${url()}/marketing/overview`)
            .set(...auth(ownerToken));
        expect(res.status).toBe(200);
        overview = res.body.data;
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('counts customers per stage now and a week ago', () => {
        expect(overview.total).toBe(6);
        expect(overview.stages).toEqual([
            // Minh arrived this week; Thu was Mới biết until the order.
            { stage: S.NEW, current: 1, previous: 1 },
            { stage: S.INTERESTED, current: 0, previous: 1 },
            { stage: S.ASKED_PRICE, current: 1, previous: 0 },
            { stage: S.BOUGHT_ONCE, current: 3, previous: 2 },
            { stage: S.BOUGHT_REPEAT, current: 1, previous: 1 },
        ]);
        expect(overview.dormant).toBe(1);
    });

    it('lists this week’s moves', () => {
        expect(overview.moves).toEqual(
            expect.arrayContaining([
                { from: S.INTERESTED, to: S.ASKED_PRICE, count: 1 },
                { from: S.NEW, to: S.BOUGHT_ONCE, count: 1 },
            ])
        );
        expect(overview.moves).toHaveLength(2);
    });

    it('splits the funnel by first channel, each step counting those further along', () => {
        const facebook = overview.funnel.find(
            (f: any) => f.platform === ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE
        );
        expect(facebook.stages.map((s: any) => s.count)).toEqual([
            5, 5, 5, 4, 1,
        ]);
        const zalo = overview.funnel.find(
            (f: any) => f.platform === ENUM_ACCOUNT_TYPE.ZALO_PAGE
        );
        expect(zalo.stages.map((s: any) => s.count)).toEqual([1, 0, 0, 0, 0]);
    });

    it('counts the Việc nên làm rows and leaves out who must not get offers', () => {
        const rows = Object.fromEntries(
            overview.todos.map((t: any) => [t.key, [t.count, t.excluded]])
        );
        expect(rows).toEqual({
            NEW: [1, 0],
            INTERESTED: [0, 0],
            ASKED_PRICE: [1, 0],
            CROSS_SELL: [1, 1], // Thu; Hoa opted out
            REPURCHASE: [1, 0], // Thu, 27 of 30 days
            WIN_BACK: [0, 1], // Mai is paused
        });
        // Thu sits in two rows but counts once.
        expect(overview.todoTotal).toEqual({ count: 3, excluded: 2 });
    });

    it('reports list health', () => {
        expect(overview.health).toEqual({
            optOuts: 1,
            optOutsPrevious: 0,
            paused: 1,
        });
    });
});
