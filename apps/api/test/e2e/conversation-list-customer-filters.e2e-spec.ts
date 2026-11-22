import { EntityManager } from '@mikro-orm/postgresql';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// The conversations list filtered by the customer's tags and journey stage,
// against Postgres. A customer with no label row counts as Mới biết; a
// conversation with no customer never matches either filter.
// Requires Postgres + Redis up and the DB seeded (migration:up && migrate:seed:e2e).
describe('E2E — conversation list customer filters', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let agentToken: string;
    let workspaceId: string;
    const tags: Record<'vip' | 'west' | 'removed', string> = {
        vip: '',
        west: '',
        removed: '',
    };

    const listSenders = async (query: string): Promise<string[]> => {
        // Stay under the throttle (10 requests per 0.5 s).
        await new Promise(resolve => setTimeout(resolve, 60));
        const res = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/${workspaceId}/conversations?${query}`)
            .set('Authorization', `Bearer ${ownerToken}`);
        expect(res.status).toBe(200);
        expect(res.body._metadata.pagination.total).toBe(res.body.data.length);
        return res.body.data.map((c: any) => c.senderId).sort();
    };

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `conv-filters-${Date.now()}`
        );

        const sql = ctx.app.get(EntityManager).getConnection();
        const one = async (query: string, params: unknown[]) =>
            (await sql.execute(query, params))[0].id as string;

        const chatbot = await one(
            `insert into chatbots (id, workspace_id, name, primary_language, model_provider, model_text_name, created_at, updated_at)
             values (gen_random_uuid(), ?, 'Bot', 'vi', 'openrouter', 'm', now(), now()) returning id`,
            [workspaceId]
        );
        const account = await one(
            `insert into accounts (id, workspace_id, external_id, name, slug, type, access_token, created_at, updated_at)
             values (gen_random_uuid(), ?, ?, 'Page', ?, 'FACEBOOK_PAGE', 't', now(), now()) returning id`,
            [workspaceId, `page-${Date.now()}`, `page-${Date.now()}`]
        );
        for (const name of Object.keys(tags) as (keyof typeof tags)[]) {
            tags[name] = await one(
                `insert into customer_tags (id, workspace_id, name, created_at, updated_at)
                 values (gen_random_uuid(), ?, ?, now(), now()) returning id`,
                [workspaceId, name]
            );
        }

        // Each conversation's sender id names its customer.
        const addConversation = async (
            sender: string,
            customer?: { stage?: string; tags: (keyof typeof tags)[] }
        ) => {
            let contactPoint: string | null = null;
            if (customer) {
                const customerId = await one(
                    `insert into customers (id, workspace_id, name, created_at, updated_at)
                     values (gen_random_uuid(), ?, ?, now(), now()) returning id`,
                    [workspaceId, sender]
                );
                contactPoint = await one(
                    `insert into contact_points (id, workspace_id, customer_id, platform, external_sender_id, created_at, updated_at)
                     values (gen_random_uuid(), ?, ?, 'FACEBOOK_PAGE', ?, now(), now()) returning id`,
                    [workspaceId, customerId, sender]
                );
                if (customer.stage) {
                    await sql.execute(
                        `insert into customer_marketing_states (id, workspace_id, customer_id, stage, permission, created_at, updated_at)
                         values (gen_random_uuid(), ?, ?, ?, 'PENDING', now(), now())`,
                        [workspaceId, customerId, customer.stage]
                    );
                }
                for (const tag of customer.tags) {
                    await sql.execute(
                        `insert into customer_tag_assignments (id, customer_id, tag_id, created_at, updated_at, deleted, deleted_at)
                         values (gen_random_uuid(), ?, ?, now(), now(), ?, ?)`,
                        [
                            customerId,
                            tags[tag],
                            tag === 'removed',
                            tag === 'removed' ? new Date() : null,
                        ]
                    );
                }
            }
            await sql.execute(
                `insert into conversations (id, chatbot_id, account_id, contact_point_id, sender_id, created_at, updated_at)
                 values (gen_random_uuid(), ?, ?, ?, ?, now(), now())`,
                [chatbot, account, contactPoint, sender]
            );
        };

        await addConversation('vip-asked', {
            stage: 'ASKED_PRICE',
            tags: ['vip'],
        });
        await addConversation('west-buyer', {
            stage: 'BOUGHT_ONCE',
            tags: ['west', 'vip'],
        });
        await addConversation('unlabelled', { tags: ['removed'] });
        await addConversation('no-customer');

        // A member whose role reads conversations but not customers.
        const [{ id: agentId }] = await sql.execute(
            `select id from users where email = ?`,
            [SEED_USERS.business]
        );
        const roleId = await one(
            `insert into roles (id, name, type, is_active, permissions, workspace_id, created_at, updated_at)
             values (gen_random_uuid(), 'Chat only', 'WORKSPACE_MEMBER', true, ?, ?, now(), now()) returning id`,
            [
                JSON.stringify([{ subject: 'CHATBOT', action: ['read'] }]),
                workspaceId,
            ]
        );
        await sql.execute(
            `insert into workspace_members (id, workspace_id, user_id, role_id, created_at)
             values (gen_random_uuid(), ?, ?, ?, now())`,
            [workspaceId, agentId, roleId]
        );
        agentToken = await login(ctx.app, ctx.base, SEED_USERS.business);
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('lists every conversation without the filters', async () => {
        expect(await listSenders('')).toEqual([
            'no-customer',
            'unlabelled',
            'vip-asked',
            'west-buyer',
        ]);
    });

    it('keeps conversations whose customer has any of the tags', async () => {
        expect(await listSenders(`tag=${tags.west}`)).toEqual(['west-buyer']);
        expect(await listSenders(`tag=${tags.vip},${tags.west}`)).toEqual([
            'vip-asked',
            'west-buyer',
        ]);
        // A removed tag no longer matches.
        expect(await listSenders(`tag=${tags.removed}`)).toEqual([]);
    });

    it('filters by stage, a customer without labels counting as NEW', async () => {
        expect(await listSenders('stage=NEW')).toEqual(['unlabelled']);
        expect(await listSenders('stage=ASKED_PRICE,BOUGHT_ONCE')).toEqual([
            'vip-asked',
            'west-buyer',
        ]);
    });

    it('combines stage, tag and the other filters', async () => {
        expect(await listSenders(`stage=ASKED_PRICE&tag=${tags.vip}`)).toEqual([
            'vip-asked',
        ]);
        expect(await listSenders(`stage=NEW&tag=${tags.vip}`)).toEqual([]);
        expect(
            await listSenders(`status=OPEN&tag=${tags.vip}&search=west`)
        ).toEqual(['west-buyer']);
    });

    it('rejects a tag that is not an id', async () => {
        const res = await http(ctx.app)
            .get(`${wsBase(ctx.base)}/${workspaceId}/conversations?tag=vip`)
            .set('Authorization', `Bearer ${ownerToken}`);
        expect(res.status).toBe(400);
    });

    it('needs the customer read ability to filter by tag or stage', async () => {
        const get = (query: string) =>
            http(ctx.app)
                .get(
                    `${wsBase(ctx.base)}/${workspaceId}/conversations?${query}`
                )
                .set('Authorization', `Bearer ${agentToken}`);

        expect((await get('')).status).toBe(200);
        expect((await get(`tag=${tags.vip}`)).status).toBe(403);
        expect((await get('stage=NEW')).status).toBe(403);
    });
});
