import { EntityManager, RequestContext } from '@mikro-orm/postgresql';
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
import { ENUM_MARKETING_AUDIENCE_MATCH } from '@app/modules/marketing/enums/marketing-audience.enum';
import {
    ENUM_MARKETING_MESSAGE_STATUS as M,
    ENUM_MARKETING_SKIP_REASON as R,
} from '@app/modules/marketing/enums/marketing-send.enum';
import { MarketingMessageEntity } from '@app/modules/marketing/repository/entities/marketing-message.entity';
import { MarketingSettingsEntity } from '@app/modules/marketing/repository/entities/marketing-settings.entity';
import { MarketingSendService } from '@app/modules/marketing/services/marketing-send.service';
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
    let addCustomer: (name: string, lastInboundHoursAgo?: number) => void;
    let flush: () => Promise<void>;
    const hour = 3_600_000;
    const ago = (h: number) => new Date(Date.now() - h * hour);
    const enqueue = jest.spyOn(CloudTasksQueueClient.prototype, 'enqueue');
    let sendMessage: jest.SpyInstance;

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
        const token = await login(ctx.app, ctx.base, SEED_USERS.individual);
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
        const chatbot = em.create(ChatbotEntity, {
            workspace,
            name: 'Lumi',
            primaryLanguage: 'vi',
            modelProvider: 'deepseek',
            modelTextName: 'deepseek-chat',
        } as Partial<ChatbotEntity> as ChatbotEntity);

        const customer = (name: string, lastInboundHoursAgo?: number) => {
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
                    account,
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
            inRequest(() => sends().send(workspaceId, offer)),
            inRequest(() =>
                sends().send(workspaceId, { ...offer, text: 'Giảm thêm 5%' })
            ),
        ]);

        // Lan and Tú are queued once between the two sends.
        expect(first.queued + second.queued).toBe(2);
        expect(first.skipped + second.skipped).toBe(4);
        for (const name of ['Lan', 'Tú']) {
            const rows = await ledger(name);
            expect(rows.filter(r => r.status === M.QUEUED)).toHaveLength(1);
            expect(rows[0].conversation?.id).toBe(conversationOf[name]);
        }
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
        await flush();
        enqueue.mockClear();
        sendMessage.mockClear();
        sendMessage.mockRejectedValue(
            new HttpException(
                {
                    upstreamStatus: 400,
                    platformError: { error: { code: 2022 } },
                    message: 'x',
                },
                HttpStatus.BAD_GATEWAY
            )
        );

        const send = await inRequest(() =>
            sends().send(workspaceId, { ...offer, text: 'Flash sale 12h' })
        );
        expect(send.queued).toBe(2);
        for (const [, , payload] of enqueue.mock.calls) {
            await inRequest(() => sends().deliver(payload.messageId as string));
        }

        expect(sendMessage).toHaveBeenCalledTimes(1);
        const rows = [...(await ledger('Phúc')), ...(await ledger('Vy'))];
        expect(rows.map(r => [r.status, r.skipReason ?? null]).sort()).toEqual(
            [
                [M.FAILED, null],
                [M.SKIPPED, R.ACCOUNT_BLOCKED],
            ].sort()
        );
    });
});
