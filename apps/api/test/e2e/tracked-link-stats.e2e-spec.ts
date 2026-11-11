import { EntityManager } from '@mikro-orm/postgresql';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { ENUM_CUSTOMER_JOURNEY_STAGE } from '@app/modules/customer/enums/customer-marketing.enum';
import { ENUM_TRACKED_LINK_KIND } from '@app/modules/customer/enums/tracked-link.enum';
import { CustomerMarketingStateEntity } from '@app/modules/customer/repository/entities/customer-marketing-state.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { TrackedLinkEntity } from '@app/modules/customer/repository/entities/tracked-link.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Source stats over HTTP, so the raw SQL behind them (bindings, the IN list,
// the FILTER and the LATERAL order count) runs against real Postgres.
// Requires Postgres + Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — tracked link stats', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let workspaceId: string;
    let sourceId: string;
    let qrId: string;
    let emptyId: string;

    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const linksUrl = () => `${wsBase(ctx.base)}/${workspaceId}/tracked-links`;
    const day = 86_400_000;

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `sources-${Date.now()}`
        );

        // Links need a connected account and customers arrive through
        // channels; no API creates either, so seed them.
        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const account = em.create(AccountEntity, {
            workspace,
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            externalId: `page-${Date.now()}`,
            name: 'Lumi Skincare',
            slug: `lumi-${Date.now()}`,
            accessToken: 'token',
        });
        const suffix = Date.now().toString(36);
        const source = em.create(TrackedLinkEntity, {
            workspace,
            account,
            name: 'Tờ rơi Tết',
            code: `to-roi-tet-${suffix}`,
        });
        const qr = em.create(TrackedLinkEntity, {
            workspace,
            account,
            parent: source,
            kind: ENUM_TRACKED_LINK_KIND.QR,
            name: 'Quầy quận 1',
            code: `to-roi-tet-q1-${suffix}`,
        });
        const empty = em.create(TrackedLinkEntity, {
            workspace,
            account,
            name: 'Black Friday',
            code: `black-friday-${suffix}`,
        });

        const arrive = (
            name: string,
            link: TrackedLinkEntity,
            stage: ENUM_CUSTOMER_JOURNEY_STAGE,
            extra: Partial<CustomerEntity> = {}
        ) => {
            const customer = em.create(CustomerEntity, {
                workspace,
                name,
                ...extra,
            });
            em.create(CustomerMarketingStateEntity, {
                workspace,
                customer,
                stage,
                firstTrackedLink: link,
                firstSourceAt: new Date(Date.now() - 10 * day),
            });
            return customer;
        };
        const buyer = arrive(
            'Chị Lan',
            source,
            ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_ONCE
        );
        arrive('Anh Minh', source, ENUM_CUSTOMER_JOURNEY_STAGE.NEW);
        arrive('Chị Hoa', qr, ENUM_CUSTOMER_JOURNEY_STAGE.ASKED_PRICE);
        // Deleted customers are not counted.
        arrive('Đã xoá', source, ENUM_CUSTOMER_JOURNEY_STAGE.BOUGHT_ONCE, {
            deletedAt: new Date(),
        } as Partial<CustomerEntity>);
        await em.flush();

        sourceId = source.id;
        qrId = qr.id;
        emptyId = empty.id;

        // One order after the customer arrived counts; one before does not.
        for (const orderedAt of [
            new Date(Date.now() - day),
            new Date(Date.now() - 30 * day),
        ]) {
            const res = await http(ctx.app)
                .post(`${wsBase(ctx.base)}/${workspaceId}/orders`)
                .set(...auth(ownerToken))
                .send({
                    customerId: buyer.id,
                    orderedAt: orderedAt.toISOString(),
                    items: [{ name: 'Serum B5', quantity: 1 }],
                });
            expect(res.status).toBe(201);
        }
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('sums a source with its codes on the list, and zero for none', async () => {
        const res = await http(ctx.app)
            .get(linksUrl())
            .set(...auth(ownerToken));
        expect(res.status).toBe(200);
        const stats = Object.fromEntries(
            res.body.data.map((row: any) => [row.id, row.stats])
        );

        expect(stats[sourceId]).toEqual({
            newCustomers: 3,
            potentialCustomers: 2,
            orders: 1,
        });
        expect(stats[emptyId]).toEqual({
            newCustomers: 0,
            potentialCustomers: 0,
            orders: 0,
        });
    });

    it('shows each code on its own on the detail page', async () => {
        const res = await http(ctx.app)
            .get(`${linksUrl()}/${sourceId}`)
            .set(...auth(ownerToken));
        expect(res.status).toBe(200);

        expect(res.body.data.stats).toEqual({
            newCustomers: 3,
            potentialCustomers: 2,
            orders: 1,
        });
        const qrRow = res.body.data.children.find((c: any) => c.id === qrId);
        expect(qrRow.stats).toEqual({
            newCustomers: 1,
            potentialCustomers: 1,
            orders: 0,
        });
    });
});
