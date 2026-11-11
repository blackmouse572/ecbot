import { EntityManager } from '@mikro-orm/postgresql';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Customer marketing labels over HTTP against Postgres: the list filters
// (a customer without a label row counts as Mới biết / Chưa đồng ý), the
// labels on each row, the reason behind an operator edit, and the
// free-message window from the customer's last message per channel.
// Requires Postgres + Redis up and the DB seeded (migration:up && migrate:seed:e2e).
describe('E2E — customer marketing labels', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let strangerToken: string;
    let workspaceId: string;
    const ids: Record<'asked' | 'stopped' | 'fresh' | 'buyer', string> = {
        asked: '',
        stopped: '',
        fresh: '',
        buyer: '',
    };

    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const customersUrl = () => `${wsBase(ctx.base)}/${workspaceId}/customers`;
    const listNames = async (query: string): Promise<string[]> => {
        // Stay under the throttle (10 requests per 0.5 s).
        await new Promise(resolve => setTimeout(resolve, 60));
        const res = await http(ctx.app)
            .get(`${customersUrl()}?${query}`)
            .set(...auth(ownerToken));
        expect(res.status).toBe(200);
        return res.body.data.map((c: any) => c.name).sort();
    };

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        strangerToken = await login(ctx.app, ctx.base, SEED_USERS.business);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `marketing-${Date.now()}`
        );

        // Customers and their messages arrive through channels; seed them.
        const sql = ctx.app.get(EntityManager).getConnection();
        const insertCustomer = async (name: string) =>
            (
                await sql.execute(
                    `insert into customers (id, workspace_id, name, created_at, updated_at)
                     values (gen_random_uuid(), ?, ?, now(), now()) returning id`,
                    [workspaceId, name]
                )
            )[0].id as string;
        ids.asked = await insertCustomer('Hỏi giá');
        ids.stopped = await insertCustomer('Đã dừng');
        ids.fresh = await insertCustomer('Chưa có nhãn');
        ids.buyer = await insertCustomer('Mua gần đây');
        const insertState = (
            customerId: string,
            stage: string,
            permission: string,
            lastInboundDaysAgo: number
        ) =>
            sql.execute(
                `insert into customer_marketing_states
                    (id, workspace_id, customer_id, stage, permission, last_inbound_at, created_at, updated_at)
                 values (gen_random_uuid(), ?, ?, ?, ?, now() - make_interval(days => ?), now(), now())`,
                [workspaceId, customerId, stage, permission, lastInboundDaysAgo]
            );
        await insertState(ids.asked, 'ASKED_PRICE', 'GRANTED', 0);
        await insertState(ids.stopped, 'BOUGHT_ONCE', 'STOPPED', 200);
        // Quiet in chat for 200 days, but ordered 30 days ago.
        await insertState(ids.buyer, 'BOUGHT_REPEAT', 'GRANTED', 200);
        await sql.execute(
            `update customer_marketing_states
                set last_order_at = now() - interval '30 days'
              where customer_id = ?`,
            [ids.buyer]
        );

        // A Messenger conversation where "Hỏi giá" wrote 18 hours ago, then
        // the bot answered (outbound does not reopen the window).
        const [chatbot] = await sql.execute(
            `insert into chatbots (id, workspace_id, name, primary_language, model_provider, model_text_name, created_at, updated_at)
             values (gen_random_uuid(), ?, 'Bot', 'vi', 'openrouter', 'm', now(), now()) returning id`,
            [workspaceId]
        );
        const [account] = await sql.execute(
            `insert into accounts (id, workspace_id, external_id, name, slug, type, access_token, created_at, updated_at)
             values (gen_random_uuid(), ?, ?, 'Page', ?, 'FACEBOOK_PAGE', 't', now(), now()) returning id`,
            [workspaceId, `page-${Date.now()}`, `page-${Date.now()}`]
        );
        const [contactPoint] = await sql.execute(
            `insert into contact_points (id, workspace_id, customer_id, platform, external_sender_id, created_at, updated_at)
             values (gen_random_uuid(), ?, ?, 'FACEBOOK_PAGE', 'psid-1', now(), now()) returning id`,
            [workspaceId, ids.asked]
        );
        const [conversation] = await sql.execute(
            `insert into conversations (id, chatbot_id, account_id, contact_point_id, sender_id, created_at, updated_at)
             values (gen_random_uuid(), ?, ?, ?, 'psid-1', now(), now()) returning id`,
            [chatbot.id, account.id, contactPoint.id]
        );
        for (const [direction, hoursAgo] of [
            ['INBOUND', 30],
            ['INBOUND', 18],
            ['OUTBOUND', 1],
        ] as const) {
            await sql.execute(
                `insert into messages (id, conversation_id, direction, author_type, author_id, text, date_sent, created_at, updated_at)
                 values (gen_random_uuid(), ?, ?, ?, 'x', 'hi', now() - make_interval(hours => ?), now(), now())`,
                [
                    conversation.id,
                    direction,
                    direction === 'INBOUND' ? 'USER' : 'BOT',
                    hoursAgo,
                ]
            );
        }
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('returns the labels on each row, defaults for a customer without any', async () => {
        const res = await http(ctx.app)
            .get(customersUrl())
            .set(...auth(ownerToken));
        expect(res.status).toBe(200);
        const byName = Object.fromEntries(
            res.body.data.map((c: any) => [c.name, c.marketing])
        );
        expect(byName['Hỏi giá']).toEqual(
            expect.objectContaining({
                stage: 'ASKED_PRICE',
                permission: 'GRANTED',
                hostile: false,
                dormant: false,
            })
        );
        expect(byName['Đã dừng']).toEqual(
            expect.objectContaining({ permission: 'STOPPED', dormant: true })
        );
        expect(byName['Chưa có nhãn']).toEqual(
            expect.objectContaining({ stage: 'NEW', permission: 'PENDING' })
        );
    });

    it('filters by stage, counting a customer without labels as Mới biết', async () => {
        expect(await listNames('stage=NEW')).toEqual(['Chưa có nhãn']);
        expect(await listNames('stage=ASKED_PRICE,NEW')).toEqual([
            'Chưa có nhãn',
            'Hỏi giá',
        ]);
        expect(await listNames('stage=BOUGHT_ONCE')).toEqual(['Đã dừng']);
    });

    it('filters by offers permission and Lâu không nhắn, together with search', async () => {
        expect(await listNames('permission=PENDING')).toEqual(['Chưa có nhãn']);
        expect(await listNames('permission=STOPPED,GRANTED')).toEqual(
            ['Hỏi giá', 'Mua gần đây', 'Đã dừng'].sort()
        );
        expect(await listNames('dormant=true')).toEqual(['Đã dừng']);
        // A recent order keeps a quiet customer out of Lâu không nhắn.
        expect(await listNames('dormant=false')).toEqual(
            ['Chưa có nhãn', 'Hỏi giá', 'Mua gần đây'].sort()
        );
        expect(await listNames('dormant=true,false')).toHaveLength(4);
        expect(
            await listNames(
                'stage=ASKED_PRICE,NEW&permission=GRANTED&search=hỏi'
            )
        ).toEqual(['Hỏi giá']);
        await new Promise(resolve => setTimeout(resolve, 60));
        const page = await http(ctx.app)
            .get(`${customersUrl()}?stage=ASKED_PRICE,NEW`)
            .set(...auth(ownerToken));
        expect(page.body._metadata.pagination.total).toBe(2);
    });

    it('keeps the reason of an operator edit and shows it as the why', async () => {
        const patch = await http(ctx.app)
            .patch(`${customersUrl()}/${ids.asked}/marketing`)
            .set(...auth(ownerToken))
            .send({
                stage: 'BOUGHT_ONCE',
                hostile: true,
                reason: 'Khách mua tại cửa hàng',
            });
        expect(patch.status).toBe(200);
        expect(patch.body.data.stage).toBe('BOUGHT_ONCE');
        expect(patch.body.data.stageEvent).toEqual(
            expect.objectContaining({
                actor: 'OPERATOR',
                oldValue: 'ASKED_PRICE',
                newValue: 'BOUGHT_ONCE',
                reason: 'Khách mua tại cửa hàng',
            })
        );
        expect(patch.body.data.hostileEvent).toEqual(
            expect.objectContaining({ reason: 'Khách mua tại cửa hàng' })
        );
    });

    it("opens the free window from the customer's last inbound message", async () => {
        const res = await http(ctx.app)
            .get(`${customersUrl()}/${ids.asked}/marketing`)
            .set(...auth(ownerToken));
        expect(res.status).toBe(200);
        const [window] = res.body.data.freeWindows;
        expect(res.body.data.freeWindows).toHaveLength(1);
        expect(window.channel).toBe('FACEBOOK_PAGE');
        const hoursLeft =
            (new Date(window.openUntil).getTime() - Date.now()) / 3_600_000;
        expect(hoursLeft).toBeGreaterThan(5.9);
        expect(hoursLeft).toBeLessThan(6.1);

        const fresh = await http(ctx.app)
            .get(`${customersUrl()}/${ids.fresh}/marketing`)
            .set(...auth(ownerToken));
        expect(fresh.body.data).toEqual(
            expect.objectContaining({
                stage: 'NEW',
                permission: 'PENDING',
                stageEvent: null,
                freeWindows: [],
            })
        );
    });

    it("hides another workspace's labels", async () => {
        const res = await http(ctx.app)
            .get(`${customersUrl()}/${ids.asked}/marketing`)
            .set(...auth(strangerToken));
        expect([403, 404]).toContain(res.status);
    });
});
