import { EntityManager, RequestContext } from '@mikro-orm/postgresql';
import { AiDecisionService } from '@app/modules/agent-builder/services/ai-decision.service';
import { ENUM_ACCOUNT_TYPE as A } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { ENUM_CUSTOMER_MARKETING_PERMISSION } from '@app/modules/customer/enums/customer-marketing.enum';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import { CustomerMarketingStateEntity } from '@app/modules/customer/repository/entities/customer-marketing-state.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { CustomerMarketingService } from '@app/modules/customer/services/customer-marketing.service';
import {
    ENUM_MARKETING_AUDIENCE_EXCLUSION as X,
    ENUM_MARKETING_AUDIENCE_MATCH,
} from '@app/modules/marketing/enums/marketing-audience.enum';
import {
    ENUM_MARKETING_MESSAGE_STATUS as M,
    ENUM_MARKETING_REPLY_STATUS,
    ENUM_MARKETING_SEND_MODE as S,
    ENUM_MARKETING_SKIP_REASON as R,
} from '@app/modules/marketing/enums/marketing-send.enum';
import { MarketingSendEntity } from '@app/modules/marketing/repository/entities/marketing-send.entity';
import {
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND,
} from '@app/modules/customer/enums/customer-marketing.enum';
import { MarketingEventEntity } from '@app/modules/customer/repository/entities/marketing-event.entity';
import { ProductGroupEntity } from '@app/modules/order/repository/entities/product-group.entity';
import { http } from './utils/http';
import { wsBase } from './utils/workspace.helper';
import { MarketingMessageEntity } from '@app/modules/marketing/repository/entities/marketing-message.entity';
import { MarketingSettingsEntity } from '@app/modules/marketing/repository/entities/marketing-settings.entity';
import { MarketingSendService } from '@app/modules/marketing/services/marketing-send.service';
import { MarketingMessageRepository } from '@app/modules/marketing/repository/repositories/marketing-message.repository';
import {
    ENUM_ORDER_SOURCE,
    ENUM_ORDER_STATUS,
} from '@app/modules/order/enums/order.enum';
import { OrderEntity } from '@app/modules/order/repository/entities/order.entity';
import { PlatformAdapterRegistry } from '@app/modules/platform/services/platform-adapter.registry';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { HttpException, HttpStatus } from '@nestjs/common';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace } from './utils/workspace.helper';

// Marketing sends (#505) against real Postgres: free-channel planning, one
// offer a day under two sends at once, delivery into the inbox, the opt-out
// check at send time, replies and orders. Cloud Tasks and Messenger are
// stubbed. Requires Postgres + Redis up and the DB seeded.
describe('E2E — marketing sends', () => {
    let ctx: E2EContext;
    let workspaceId: string;
    const ids: Record<string, string> = {};
    const conversationOf: Record<string, string> = {};
    const senderOf: Record<string, string> = {};
    let addCustomer: (
        name: string,
        lastInboundHoursAgo?: number,
        onSecondPage?: boolean
    ) => void;
    let firstPageId: string;
    let flush: () => Promise<void>;
    const hour = 3_600_000;
    const ago = (h: number) => new Date(Date.now() - h * hour);
    const enqueue = jest.spyOn(CloudTasksQueueClient.prototype, 'enqueue');
    let sendMessage: jest.SpyInstance;
    let token: string;
    let onceId: string;
    const url = (path: string) =>
        `${wsBase(ctx.base)}/${workspaceId}/marketing/sends${path}`;
    const auth = (): [string, string] => ['Authorization', `Bearer ${token}`];

    // Services run in a request's context in the app; give them one here.
    const inRequest = <T>(fn: () => Promise<T>): Promise<T> =>
        RequestContext.create(ctx.app.get(EntityManager), fn);
    const sends = () => ctx.app.get(MarketingSendService);
    const ledger = (customer: string) =>
        ctx.app
            .get(EntityManager)
            .fork()
            .find(
                MarketingMessageEntity,
                { customer: ids[customer] },
                { orderBy: { createdAt: 'asc' } }
            );
    const offer = {
        name: 'Mẫu áo mới',
        mode: S.ONCE,
        audience: {
            match: ENUM_MARKETING_AUDIENCE_MATCH.ALL,
            conditions: [
                { field: 'CHANNEL', operator: 'IN', values: [A.FACEBOOK_PAGE] },
            ],
        } as any,
        text: 'Mẫu áo mới về, giảm 20% đến Chủ nhật',
    };

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        token = await login(ctx.app, ctx.base, SEED_USERS.individual);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            token,
            `sends-${Date.now()}`
        );
        enqueue.mockResolvedValue(undefined);
        sendMessage = jest
            .spyOn(
                ctx.app.get(PlatformAdapterRegistry).get(A.FACEBOOK_PAGE),
                'sendMessage'
            )
            .mockResolvedValue({ externalId: `mid.${Date.now()}` });

        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const suffix = Date.now().toString(36);
        // Send hours all day, so the offer goes out now whenever this runs.
        em.create(MarketingSettingsEntity, {
            workspace,
            sendFrom: '00:00',
            sendTo: '23:59',
        } as MarketingSettingsEntity);
        const account = em.create(AccountEntity, {
            workspace,
            type: A.FACEBOOK_PAGE,
            externalId: `page-${suffix}`,
            name: 'Lumi Fashion',
            slug: `lumi-${suffix}`,
            accessToken: 'token',
        });
        const secondPage = em.create(AccountEntity, {
            workspace,
            type: A.FACEBOOK_PAGE,
            externalId: `page2-${suffix}`,
            name: 'Lumi Outlet',
            slug: `lumi-outlet-${suffix}`,
            accessToken: 'token',
        });
        firstPageId = account.id;
        const chatbot = em.create(ChatbotEntity, {
            workspace,
            name: 'Lumi',
            primaryLanguage: 'vi',
            modelProvider: 'deepseek',
            modelTextName: 'deepseek-chat',
        } as Partial<ChatbotEntity> as ChatbotEntity);

        const customer = (
            name: string,
            lastInboundHoursAgo?: number,
            onSecondPage = false
        ) => {
            const c = em.create(CustomerEntity, {
                workspace,
                name,
            } as Partial<CustomerEntity> as CustomerEntity);
            const contactPoint = em.create(ContactPointEntity, {
                workspace,
                customer: c,
                platform: A.FACEBOOK_PAGE,
                externalSenderId: `${name}-${suffix}`,
            });
            em.create(CustomerMarketingStateEntity, {
                workspace,
                customer: c,
                lastInboundAt: ago(lastInboundHoursAgo ?? 24 * 10),
            } as CustomerMarketingStateEntity);
            if (lastInboundHoursAgo !== undefined) {
                const conversation = em.create(ConversationEntity, {
                    chatbot,
                    account: onSecondPage ? secondPage : account,
                    contactPoint,
                    senderId: `${name}-${suffix}`,
                } as Partial<ConversationEntity> as ConversationEntity);
                em.create(MessageEntity, {
                    conversation,
                    direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                    authorType: ENUM_MESSAGE_AUTHOR.USER,
                    authorId: `${name}-${suffix}`,
                    text: 'shop ơi',
                    dateSent: ago(lastInboundHoursAgo),
                } as Partial<MessageEntity> as MessageEntity);
                conversationOf[name] = conversation.id;
                senderOf[name] = conversation.senderId;
            }
            ids[name] = c.id;
        };
        addCustomer = customer;
        flush = () => em.flush();
        customer('Lan', 2);
        customer('Tú', 1);
        // Messenger's 24 hours ran out.
        customer('Minh', 30);
        // Never wrote: no conversation to send in.
        customer('Hoa');
        await em.flush();
    });

    afterAll(async () => {
        enqueue.mockRestore();
        sendMessage?.mockRestore();
        await ctx?.close();
    });

    it('queues one offer a day per customer even when two sends start together', async () => {
        const [first, second] = await Promise.all([
            inRequest(() => sends().create(workspaceId, offer)),
            inRequest(() =>
                sends().create(workspaceId, { ...offer, text: 'Giảm thêm 5%' })
            ),
        ]);
        onceId = first.id;
        const [a, b] = await Promise.all(
            [first, second].map(send => sends().stats(send.id))
        );

        // Lan and Tú are queued once between the two sends. The other send
        // either left them out (it planned second) or records why it skipped
        // them (both planned at once), never drops them without a trace.
        expect(a.queued + b.queued).toBe(2);
        let skippedToday = 0;
        for (const name of ['Lan', 'Tú']) {
            const rows = await ledger(name);
            expect(rows.filter(r => r.status === M.QUEUED)).toHaveLength(1);
            expect(rows[0].conversation?.id).toBe(conversationOf[name]);
            for (const row of rows.filter(r => r.status !== M.QUEUED)) {
                expect(row.skipReason).toBe(R.OFFERED_TODAY);
                skippedToday++;
            }
        }
        const leftOutToday = [first, second].reduce(
            (sum, send) => sum + (send.excluded[X.OFFERED_TODAY] ?? 0),
            0
        );
        expect(skippedToday + leftOutToday).toBe(2);
        expect((await ledger('Minh')).map(r => r.skipReason)).toEqual([
            R.WINDOW_CLOSED,
            R.WINDOW_CLOSED,
        ]);
        expect((await ledger('Hoa')).map(r => r.skipReason)).toEqual([
            R.NO_CHANNEL,
            R.NO_CHANNEL,
        ]);
        expect(enqueue).toHaveBeenCalledTimes(2);
    });

    it('sends into the inbox as the bot, and skips who opted out since', async () => {
        const em = ctx.app.get(EntityManager).fork();
        await em.nativeUpdate(
            CustomerMarketingStateEntity,
            { customer: ids['Tú'] },
            { permission: ENUM_CUSTOMER_MARKETING_PERMISSION.STOPPED }
        );

        for (const [, , payload] of enqueue.mock.calls) {
            await inRequest(() => sends().deliver(payload.messageId as string));
        }

        const [lan] = await ledger('Lan');
        expect(lan.status).toBe(M.SENT);
        expect(lan.sentAt).toBeInstanceOf(Date);
        const [tu] = await ledger('Tú');
        expect(tu).toMatchObject({
            status: M.SKIPPED,
            skipReason: R.OPTED_OUT,
        });

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(sendMessage.mock.calls[0][1]).toBe(senderOf['Lan']);
        expect(sendMessage.mock.calls[0][2].quickReplies).toEqual([
            { id: 'marketing.stop', label: 'Không nhận nữa', value: 'dừng' },
        ]);
        const botMessages = await em.find(MessageEntity, {
            conversation: conversationOf['Lan'],
            authorType: ENUM_MESSAGE_AUTHOR.BOT,
        });
        expect(botMessages).toHaveLength(1);
        expect(botMessages[0].text).toMatch(/^(Mẫu áo mới về|Giảm thêm 5%)/);
        expect(botMessages[0].externalId).toMatch(/^mid\./);

        // A retried task sends nothing twice.
        await inRequest(() => sends().deliver(lan.id));
        expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it('counts the reply within 72 hours and the order within 7 days', async () => {
        await inRequest(() =>
            ctx.app.get(CustomerMarketingService).recordInbound({
                customerId: ids['Lan'],
                workspaceId,
                text: 'còn size M không shop',
            })
        );
        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const customer = em.getReference(CustomerEntity, ids['Lan']);
        const order = (
            code: string,
            inDays: number,
            status = ENUM_ORDER_STATUS.CONFIRMED
        ) =>
            em.create(OrderEntity, {
                workspace,
                customer,
                code: `${code}-${Date.now()}`,
                total: 350_000,
                currency: 'VND',
                status,
                source: ENUM_ORDER_SOURCE.CHAT,
                orderedAt: new Date(Date.now() + inDays * 24 * hour),
            } as Partial<OrderEntity> as OrderEntity);
        order('A', 0.01);
        // Cancelled, and one long after the offer: neither counts.
        order('B', 1, ENUM_ORDER_STATUS.CANCELLED);
        order('C', 8);
        await em.flush();

        const [lan] = (await ledger('Lan')).filter(r => r.status === M.SENT);
        expect(lan.repliedAt).toBeInstanceOf(Date);
        expect(await inRequest(() => sends().stats(lan.send.id))).toMatchObject(
            {
                sent: 1,
                replied: 1,
                ordered: 1,
                revenue: 350_000,
            }
        );
    });

    it('stops the rest of a send on a page the platform blocked', async () => {
        addCustomer('Phúc', 1);
        addCustomer('Vy', 1);
        // On another page of the shop, which is not blocked.
        addCustomer('Quân', 1, true);
        await flush();
        enqueue.mockClear();
        sendMessage.mockClear();
        sendMessage.mockImplementation(async (account: AccountEntity) => {
            if (account.id !== firstPageId) return { externalId: 'mid.ok' };
            throw new HttpException(
                {
                    upstreamStatus: 400,
                    platformError: { error: { code: 2022 } },
                    message: 'x',
                },
                HttpStatus.BAD_GATEWAY
            );
        });

        const send = await inRequest(() =>
            sends().create(workspaceId, { ...offer, text: 'Flash sale 12h' })
        );
        expect((await sends().stats(send.id)).queued).toBe(3);
        for (const [, , payload] of enqueue.mock.calls) {
            await inRequest(() => sends().deliver(payload.messageId as string));
        }

        // One try on the blocked page, one send on the other page.
        expect(sendMessage).toHaveBeenCalledTimes(2);
        expect((await ledger('Quân')).map(r => r.status)).toEqual([M.SENT]);
        const rows = [...(await ledger('Phúc')), ...(await ledger('Vy'))];
        expect(rows.map(r => [r.status, r.skipReason ?? null]).sort()).toEqual(
            [
                [M.FAILED, null],
                [M.SKIPPED, R.ACCOUNT_BLOCKED],
            ].sort()
        );
    });

    it('shows Đã gửi over HTTP: results, by channel, not sent, and replies', async () => {
        const [lan] = (await ledger('Lan')).filter(r => r.status === M.SENT);
        const em = ctx.app.get(EntityManager).fork();
        em.create(MessageEntity, {
            conversation: em.getReference(
                ConversationEntity,
                conversationOf['Lan']
            ),
            direction: ENUM_MESSAGE_DIRECTION.INBOUND,
            authorType: ENUM_MESSAGE_AUTHOR.USER,
            authorId: senderOf['Lan'],
            text: 'còn size M không shop',
            dateSent: new Date(lan.sentAt!.getTime() + 60_000),
        } as Partial<MessageEntity> as MessageEntity);
        await em.flush();

        const list = await http(ctx.app)
            .get(url('?mode=ONCE'))
            .set(...auth());
        expect(list.status).toBe(200);
        const row = list.body.data.find((d: any) => d.id === lan.send.id);
        expect(row).toMatchObject({
            name: 'Mẫu áo mới',
            mode: S.ONCE,
            stats: { sent: 1, replied: 1, ordered: 1 },
        });
        expect(row.stats.lastSentAt).toBeTruthy();

        const detail = await http(ctx.app)
            .get(url(`/${lan.send.id}`))
            .set(...auth());
        expect(detail.status).toBe(200);
        expect(detail.body.data.channels).toEqual([
            {
                channel: A.FACEBOOK_PAGE,
                sent: 1,
                replied: 1,
                ordered: 1,
                optedOut: 0,
            },
        ]);
        expect(detail.body.data.notSent).toEqual(
            expect.arrayContaining([
                { reason: R.WINDOW_CLOSED, count: 1 },
                { reason: R.NO_CHANNEL, count: 1 },
            ])
        );

        const replies = await http(ctx.app)
            .get(url(`/${lan.send.id}/replies`))
            .set(...auth());
        expect(replies.status).toBe(200);
        expect(replies.body._metadata.pagination.total).toBe(1);
        expect(replies.body.data).toEqual([
            expect.objectContaining({
                customerId: ids['Lan'],
                name: 'Lan',
                text: 'còn size M không shop',
                status: ENUM_MARKETING_REPLY_STATUS.ORDERED,
            }),
        ]);

        // Only a send that runs each day turns on or off.
        const patch = await http(ctx.app)
            .patch(url(`/${lan.send.id}`))
            .set(...auth())
            .send({ active: false });
        expect(patch.status).toBe(400);
        const other = await http(ctx.app)
            .get(url('/00000000-0000-4000-8000-000000000000'))
            .set(...auth());
        expect(other.status).toBe(404);
    });

    it('runs an AUTO send each day for new customers, naming their product', async () => {
        addCustomer('Mai', 1);
        await flush();
        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const serum = em.create(ProductGroupEntity, {
            workspace,
            name: 'Serum vitamin C',
        } as Partial<ProductGroupEntity> as ProductGroupEntity);
        em.create(MarketingEventEntity, {
            workspace,
            customer: em.getReference(CustomerEntity, ids['Mai']),
            kind: ENUM_MARKETING_EVENT_KIND.INTENT,
            actor: ENUM_MARKETING_EVENT_ACTOR.CLASSIFIER,
            newValue: 'ASKED_PRICE',
            productGroup: serum,
        } as Partial<MarketingEventEntity> as MarketingEventEntity);
        await em.flush();
        enqueue.mockClear();
        sendMessage.mockReset();
        sendMessage.mockResolvedValue({ externalId: 'mid.auto' });

        const created = await http(ctx.app)
            .post(url(''))
            .set(...auth())
            .send({
                ...offer.audience,
                name: 'Chào khách hỏi giá',
                mode: S.AUTO,
                text: 'Chào {name}, {product} bạn hỏi vẫn còn hàng',
            });
        expect(created.status).toBe(201);
        const autoId = created.body.data.id;
        expect(created.body.data).toMatchObject({
            mode: S.AUTO,
            active: true,
        });

        const mai = (await ledger('Mai')).find(r => r.send.id === autoId);
        expect(mai?.status).toBe(M.QUEUED);
        await inRequest(() => sends().deliver(mai!.id));
        expect(sendMessage.mock.calls[0][2].content).toEqual({
            kind: 'text',
            text: 'Chào Mai, Serum vitamin C bạn hỏi vẫn còn hàng',
        });

        // The next day: only the customer who newly matches is planned.
        addCustomer('Nga', 1);
        await flush();
        await em.nativeUpdate(
            MarketingSendEntity,
            { id: autoId },
            { lastRunDay: '2000-01-01' }
        );
        await inRequest(() => sends().runDueAuto());
        await inRequest(() => sends().runDueAuto());
        expect((await ledger('Nga')).filter(r => r.send.id === autoId)).toEqual(
            [expect.objectContaining({ status: M.QUEUED })]
        );
        expect(
            (await ledger('Mai')).filter(r => r.send.id === autoId)
        ).toHaveLength(1);

        // Tắt tự gửi: the next day's run plans nobody.
        const off = await http(ctx.app)
            .patch(url(`/${autoId}`))
            .set(...auth())
            .send({ active: false });
        expect(off.status).toBe(200);
        expect(off.body.data.active).toBe(false);
        addCustomer('Khoa', 1);
        await flush();
        await em.nativeUpdate(
            MarketingSendEntity,
            { id: autoId },
            { lastRunDay: '2000-01-01' }
        );
        await inRequest(() => sends().runDueAuto());
        expect(
            (await ledger('Khoa')).filter(r => r.send.id === autoId)
        ).toHaveLength(0);
    });

    it('drafts a send text with AI soạn giúp, for a stage and the shop offer', async () => {
        const write = jest
            .spyOn(ctx.app.get(AiDecisionService), 'write')
            .mockResolvedValue({
                text: 'Chào {name} — {product} bạn hỏi đang giảm 10% nha.',
                usage: null,
            });
        const draft = await http(ctx.app)
            .post(url('/draft'))
            .set(...auth())
            .send({ preset: 'ASKED_PRICE', offer: 'Giảm 10% đến 20/11' });
        expect(draft.status).toBe(200);
        expect(draft.body.data).toEqual({
            text: 'Chào {name}, {product} bạn hỏi đang giảm 10% nha.',
        });
        expect(write.mock.calls[0][1]).toContain('Giảm 10% đến 20/11');

        write.mockResolvedValueOnce({ text: '', usage: null });
        const failed = await http(ctx.app)
            .post(url('/draft'))
            .set(...auth())
            .send({ preset: 'ASKED_PRICE' });
        expect(failed.status).toBe(503);

        const bad = await http(ctx.app)
            .post(url('/draft'))
            .set(...auth())
            .send({ preset: 'ASKED_PRICE', language: 'fr' });
        expect(bad.status).toBe(422);

        // Ngắn hơn works on the current text, so it needs one.
        const shorter = await http(ctx.app)
            .post(url('/draft'))
            .set(...auth())
            .send({
                preset: 'ASKED_PRICE',
                previous: 'Chào {name}, Lumi giảm 10% nha.',
                rewrite: 'SHORTER',
                tone: 'PLAYFUL',
            });
        expect(shorter.status).toBe(200);
        expect(write.mock.calls.at(-1)?.[0]).toContain('shorter');
        const noText = await http(ctx.app)
            .post(url('/draft'))
            .set(...auth())
            .send({ preset: 'ASKED_PRICE', rewrite: 'LONGER' });
        expect(noText.status).toBe(422);

        // The audience checks of a send: neither, or both, is a 400.
        for (const body of [
            {},
            { preset: 'NEW', conditions: offer.audience.conditions },
        ]) {
            const refused = await http(ctx.app)
                .post(url('/draft'))
                .set(...auth())
                .send(body);
            expect(refused.status).toBe(400);
        }
        write.mockRestore();
    });

    it('records an offer two sends planned at once for the same day as skipped', async () => {
        const [sent] = (await ledger('Lan')).filter(r => r.status === M.SENT);
        const other = await inRequest(() =>
            sends().create(workspaceId, { ...offer, name: 'Cùng ngày' })
        );
        // Planned at the same moment as Lan's offer of today: the unique
        // index drops the QUEUED row, so it is written as skipped instead.
        const queued = await ctx.app
            .get(MarketingMessageRepository)
            .plan(workspaceId, other.id, [
                {
                    customerId: ids['Lan'],
                    channel: A.FACEBOOK_PAGE,
                    conversationId: conversationOf['Lan'],
                    status: M.QUEUED,
                    skipReason: null,
                    sendDay: sent.sendDay,
                },
            ]);
        expect(queued).toEqual([]);
        expect(
            (await ledger('Lan')).filter(r => r.send.id === other.id)
        ).toEqual([
            expect.objectContaining({
                status: M.SKIPPED,
                skipReason: R.OFFERED_TODAY,
            }),
        ]);
        // Đã gửi shows one row per reason, whether left out or skipped.
        const detail = await http(ctx.app)
            .get(url(`/${other.id}`))
            .set(...auth());
        const reasons = detail.body.data.notSent.map(
            (r: { reason: string }) => r.reason
        );
        expect(
            reasons.filter((r: string) => r === R.OFFERED_TODAY)
        ).toHaveLength(1);
        // Lan was left out at create and then skipped by the plan: she
        // counts once, so the row stays at the create-time count.
        expect(
            detail.body.data.notSent.find(
                (r: { reason: string }) => r.reason === R.OFFERED_TODAY
            ).count
        ).toBe(other.excluded[X.OFFERED_TODAY]);
    });

    it('credits a reply and an order only to the latest offer', async () => {
        addCustomer('Nhi', 1);
        await flush();
        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const customer = em.getReference(CustomerEntity, ids['Nhi']);
        const newSend = (name: string) =>
            em.create(MarketingSendEntity, {
                workspace,
                name,
                audience: { preset: 'NEW' },
                text: name,
            } as Partial<MarketingSendEntity> as MarketingSendEntity);
        const sentAgo = (send: MarketingSendEntity, hours: number) =>
            em.create(MarketingMessageEntity, {
                workspace,
                send,
                customer,
                channel: A.FACEBOOK_PAGE,
                status: M.SENT,
                sendDay: ago(hours).toISOString().slice(0, 10),
                sentAt: ago(hours),
            } as Partial<MarketingMessageEntity> as MarketingMessageEntity);
        const older = newSend('Tin cũ');
        const latest = newSend('Tin mới');
        sentAgo(older, 48);
        sentAgo(latest, 24);
        await em.flush();

        await inRequest(() =>
            ctx.app.get(CustomerMarketingService).recordInbound({
                customerId: ids['Nhi'],
                workspaceId,
                text: 'ok shop, lấy 1 cái',
            })
        );
        em.create(OrderEntity, {
            workspace,
            customer,
            code: `N-${Date.now()}`,
            total: 200_000,
            currency: 'VND',
            status: ENUM_ORDER_STATUS.CONFIRMED,
            source: ENUM_ORDER_SOURCE.CHAT,
            orderedAt: new Date(),
        } as Partial<OrderEntity> as OrderEntity);
        await em.flush();

        const [o, l] = await Promise.all(
            [older, latest].map(send => inRequest(() => sends().stats(send.id)))
        );
        expect(o).toMatchObject({
            sent: 1,
            replied: 0,
            ordered: 0,
            revenue: 0,
        });
        expect(l).toMatchObject({
            sent: 1,
            replied: 1,
            ordered: 1,
            revenue: 200_000,
        });
    });

    it('does not mark a reply as ordered when a newer offer came before the order', async () => {
        addCustomer('Thảo', 1);
        await flush();
        const em = ctx.app.get(EntityManager).fork();
        const workspace = em.getReference(WorkspaceEntity, workspaceId);
        const customer = em.getReference(CustomerEntity, ids['Thảo']);
        const newSend = (name: string) =>
            em.create(MarketingSendEntity, {
                workspace,
                name,
                audience: { preset: 'NEW' },
                text: name,
            } as Partial<MarketingSendEntity> as MarketingSendEntity);
        const sentAgo = (send: MarketingSendEntity, hours: number) =>
            em.create(MarketingMessageEntity, {
                workspace,
                send,
                customer,
                channel: A.FACEBOOK_PAGE,
                status: M.SENT,
                sendDay: ago(hours).toISOString().slice(0, 10),
                sentAt: ago(hours),
            } as Partial<MarketingMessageEntity> as MarketingMessageEntity);
        // Thảo answers offer A while it is her latest.
        const older = newSend('Tin A');
        sentAgo(older, 48);
        await em.flush();
        await inRequest(() =>
            ctx.app.get(CustomerMarketingService).recordInbound({
                customerId: ids['Thảo'],
                workspaceId,
                text: 'để em xem',
            })
        );
        // Then offer B reaches her, and she orders inside A's 7 days.
        sentAgo(newSend('Tin B'), 1);
        em.create(OrderEntity, {
            workspace,
            customer,
            code: `T-${Date.now()}`,
            total: 150_000,
            currency: 'VND',
            status: ENUM_ORDER_STATUS.CONFIRMED,
            source: ENUM_ORDER_SOURCE.CHAT,
            orderedAt: new Date(),
        } as Partial<OrderEntity> as OrderEntity);
        await em.flush();

        const replies = await inRequest(() => sends().replies(older.id, 10, 0));
        expect(replies).toEqual([
            expect.objectContaining({ customerId: ids['Thảo'] }),
        ]);
        expect(replies[0].status).not.toBe(ENUM_MARKETING_REPLY_STATUS.ORDERED);
    });
});
