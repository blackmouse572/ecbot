import { EntityManager } from '@mikro-orm/postgresql';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { ENUM_ACCOUNT_TYPE as A } from '@app/modules/account/enums/account.enum';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import { CustomerMarketingStateEntity } from '@app/modules/customer/repository/entities/customer-marketing-state.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { ENUM_MARKETING_MESSAGE_STATUS as M } from '@app/modules/marketing/enums/marketing-send.enum';
import { MarketingMessageEntity } from '@app/modules/marketing/repository/entities/marketing-message.entity';
import { MarketingSendEntity } from '@app/modules/marketing/repository/entities/marketing-send.entity';
import { ENUM_MARKETING_AUDIENCE_MATCH } from '@app/modules/marketing/enums/marketing-audience.enum';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Send rules (#505) over HTTP: Cài đặt gửi tin, and the caps and the rest
// rule as audience exclusions against real Postgres. Requires Postgres +
// Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — marketing send rules', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let workspaceId: string;

    const day = 86_400_000;
    const ago = (days: number) => new Date(Date.now() - days * day);
    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const url = () => `${wsBase(ctx.base)}/${workspaceId}/marketing`;
    // Stay under the throttle (10 requests per 0.5 s).
    const pause = () => new Promise(resolve => setTimeout(resolve, 60));
    const settings = async (body?: object) => {
        await pause();
        const req = body
            ? http(ctx.app).patch(`${url()}/settings`).send(body)
            : http(ctx.app).get(`${url()}/settings`);
        return req.set(...auth(ownerToken));
    };
    const preview = async () => {
        await pause();
        return http(ctx.app)
            .post(`${url()}/audiences/preview`)
            .set(...auth(ownerToken))
            .send({
                match: 'ALL',
                conditions: [
                    {
                        field: 'CHANNEL',
                        operator: 'IN',
                        values: [A.FACEBOOK_PAGE],
                    },
                ],
            });
    };
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
            `send-rules-${Date.now()}`
        );

        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const suffix = Date.now().toString(36);
        const customer = (name: string, lastInboundDaysAgo: number) => {
            const c = em.create(CustomerEntity, {
                workspace,
                name,
                createdAt: ago(90),
            } as Partial<CustomerEntity> as CustomerEntity);
            em.create(ContactPointEntity, {
                workspace,
                customer: c,
                platform: A.FACEBOOK_PAGE,
                externalSenderId: `${name}-${suffix}`,
            });
            em.create(CustomerMarketingStateEntity, {
                workspace,
                customer: c,
                lastInboundAt: ago(lastInboundDaysAgo),
            } as CustomerMarketingStateEntity);
            return c;
        };
        const send = em.create(MarketingSendEntity, {
            workspace,
            audience: { match: ENUM_MARKETING_AUDIENCE_MATCH.ALL, conditions: [] },
            text: 'Ưu đãi',
        } as Partial<MarketingSendEntity> as MarketingSendEntity);
        const offer = (c: CustomerEntity, daysAgo: number, status = M.SENT) => {
            const at = ago(daysAgo);
            em.create(MarketingMessageEntity, {
                workspace,
                send,
                customer: c,
                channel: A.FACEBOOK_PAGE,
                status,
                // The shop's day, as the API counts it.
                sendDay: ctx.app.get(HelperDateService).formatToIsoDate(at),
                sentAt: status === M.SENT ? at : null,
            } as MarketingMessageEntity);
        };

        // Three offers in the last 30 days: at the cap.
        const an = customer('An', 50);
        [20, 10, 5].forEach(d => offer(an, d));
        // One offer queued today: no second one today.
        const binh = customer('Bình', 50);
        offer(binh, 0, M.QUEUED);
        // Three unanswered offers, the last 31 days ago: resting until
        // 72 hours plus 30 days after it.
        const chi = customer('Chi', 60);
        [45, 38, 31].forEach(d => offer(chi, d));
        // The same, but she wrote back after the first one.
        const dung = customer('Dũng', 42);
        [45, 38, 31].forEach(d => offer(dung, d));
        // Failed and skipped offers never use up quota.
        const em2 = customer('Em', 50);
        [3, 2, 1].forEach(d => offer(em2, d, M.FAILED));
        offer(em2, 1, M.SKIPPED);
        await em.flush();
    });

    afterAll(async () => {
        await ctx?.close();
    });

    it('shows the defaults before the shop saves', async () => {
        const res = await settings();
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({
            maxPer30Days: 3,
            maxPerDay: 1,
            restAfter: 3,
            restDays: 30,
            sendFrom: '09:00',
            sendTo: '20:00',
            stopKeywords: ['dừng', 'dung', 'stop'],
            stopReply: null,
            stopReplyEnabled: true,
        });
    });

    it('leaves out who had their offers, and who keeps ignoring them', async () => {
        const res = await preview();
        expect(res.status).toBe(200);
        // An is at the 30-day cap, Bình has one today, Chi rests.
        expect(reasons(res)).toEqual({
            CAPPED: 1,
            OFFERED_TODAY: 1,
            RESTING: 1,
        });
        // Dũng answered; Em's offers never went out.
        expect(res.body.data.count).toBe(2);
    });

    it("applies the shop's own caps and rest rule", async () => {
        const saved = await settings({
            maxPer30Days: 4,
            restAfter: 4,
            restDays: 20,
            stopKeywords: ['Huỷ', 'huỷ'],
            stopReply: 'Dạ shop ngưng gửi ạ.',
        });
        expect(saved.status).toBe(200);
        expect(saved.body.data).toMatchObject({
            maxPer30Days: 4,
            restAfter: 4,
            restDays: 20,
            stopKeywords: ['huỷ'],
            stopReply: 'Dạ shop ngưng gửi ạ.',
        });

        const res = await preview();
        // An has room for a fourth and rests only after four unanswered;
        // Chi's 20 days of rest are over. Bình still has one today.
        expect(reasons(res)).toEqual({ OFFERED_TODAY: 1 });
        expect(res.body.data.count).toBe(4);
    });

    it('keeps the rest of the settings when one changes', async () => {
        const res = await settings({ sendTo: '21:30' });
        expect(res.body.data).toMatchObject({
            maxPer30Days: 4,
            sendFrom: '09:00',
            sendTo: '21:30',
        });
    });

    it('refuses send hours that end before they start, and values out of range', async () => {
        const hours = await settings({ sendFrom: '22:00' });
        expect(hours.status).toBe(400);
        const cap = await settings({ maxPer30Days: 0 });
        expect(cap.status).toBe(422);
        const time = await settings({ sendTo: '25:00' });
        expect(time.status).toBe(422);
        const cleared = await settings({ restDays: null });
        expect(cleared.status).toBe(422);
    });
});
