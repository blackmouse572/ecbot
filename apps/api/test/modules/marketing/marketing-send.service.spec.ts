import { HttpException, HttpStatus } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE as A } from 'src/modules/account/enums/account.enum';
import {
    ENUM_MARKETING_MESSAGE_STATUS as S,
    ENUM_MARKETING_SEND_MODE as M,
    ENUM_MARKETING_SKIP_REASON as R,
} from 'src/modules/marketing/enums/marketing-send.enum';
import { MarketingSendService } from 'src/modules/marketing/services/marketing-send.service';

const HOUR = 3_600_000;
// 10:00 in Asia/Ho_Chi_Minh, inside the default 09:00-20:00.
const now = new Date('2026-11-22T03:00:00.000Z');
const ago = (h: number) => new Date(now.getTime() - h * HOUR);

describe('MarketingSendService', () => {
    const sendRepository = {
        getEntityManager: () => ({
            getReference: (_: unknown, id: string) => ({ id }),
        }),
        create: jest.fn(),
        findDueAuto: jest.fn(),
        claimRun: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(async (x: unknown) => x),
    };
    const ledger = {
        plan: jest.fn(),
        stats: jest.fn(),
        findQueued: jest.fn(),
        isStopped: jest.fn(),
        finish: jest.fn(),
        claim: jest.fn(),
        markReplied: jest.fn(),
        skipQueuedOnAccount: jest.fn(),
        reachedBy: jest.fn(),
        productFor: jest.fn(),
    };
    const audience = {
        toAudience: jest.fn(a => a),
        reached: jest.fn(),
        preview: jest.fn(),
    };
    const settings = { rules: jest.fn(), stopKeyword: jest.fn() };
    const conversations = { lastInboundByCustomerChannel: jest.fn() };
    const messages = {
        insertPendingOutbound: jest.fn(),
        markOutboundSent: jest.fn(),
        markOutboundFailed: jest.fn(),
    };
    const tasks = { enqueue: jest.fn() };
    const helperDate = { formatToIsoDate: () => '2026-11-22' };
    const config = { get: () => 'Asia/Ho_Chi_Minh' };
    const messenger = {
        capabilities: {
            quickReplies: true,
            freeMessageWindowHours: 24,
        },
        sendMessage: jest.fn(),
    };
    const zalo = {
        capabilities: {
            quickReplies: false,
            freeMessageWindowHours: 48,
        },
        sendMessage: jest.fn(),
    };
    const adapters: Partial<Record<A, typeof messenger>> = {
        [A.FACEBOOK_PAGE]: messenger,
        [A.ZALO_PAGE]: zalo,
    };
    const registry = {
        has: (type: A) => type in adapters,
        get: (type: A) => adapters[type],
    };
    const service = new MarketingSendService(
        sendRepository as any,
        ledger as any,
        audience as any,
        settings as any,
        conversations as any,
        messages as any,
        tasks as any,
        helperDate as any,
        config as any,
        { get: () => registry } as any
    );

    const input = {
        name: 'Chào khách mới',
        mode: M.ONCE,
        audience: { preset: 'NEW' } as any,
        text: 'Mẫu mới về, giảm 20% hôm nay',
    };

    beforeEach(() => {
        jest.resetAllMocks();
        audience.toAudience.mockImplementation(a => a);
        sendRepository.create.mockImplementation(async (data: object) => ({
            id: 'send1',
            ...data,
        }));
        sendRepository.save.mockImplementation(async (x: unknown) => x);
        audience.preview.mockResolvedValue({
            excluded: {
                total: 2,
                reasons: [
                    { reason: 'STOPPED', count: 0 },
                    { reason: 'CAPPED', count: 2 },
                ],
            },
        });
        ledger.reachedBy.mockResolvedValue(new Set());
        ledger.productFor.mockResolvedValue(null);
        settings.rules.mockResolvedValue({
            maxPer30Days: 3,
            restAfter: 3,
            restDays: 30,
            sendFrom: '09:00',
            sendTo: '20:00',
        });
        settings.stopKeyword.mockResolvedValue('dừng');
        ledger.stats.mockResolvedValue({ queued: 1 });
        ledger.finish.mockResolvedValue(true);
        ledger.claim.mockResolvedValue(true);
        messages.insertPendingOutbound.mockResolvedValue({});
        messenger.sendMessage.mockResolvedValue({ externalId: 'mid.1' });
        zalo.sendMessage.mockResolvedValue({ externalId: 'z.1' });
    });

    describe('create', () => {
        beforeEach(() => {
            audience.reached.mockResolvedValue({
                ids: ['lan', 'minh', 'hoa'],
                total: 3,
            });
            conversations.lastInboundByCustomerChannel.mockResolvedValue([
                {
                    customerId: 'lan',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-lan',
                    accountId: 'page-1',
                    lastInboundAt: ago(2),
                },
                {
                    customerId: 'minh',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-minh',
                    accountId: 'page-1',
                    lastInboundAt: ago(30),
                },
            ]);
            ledger.plan.mockResolvedValue([
                { id: 'm-lan', customerId: 'lan', sendDay: '2026-11-22' },
            ]);
        });

        it('queues customers on a free channel and keeps why the rest were skipped', async () => {
            const result = await service.create('ws1', input, 'user1', now);

            expect(sendRepository.create).toHaveBeenCalledWith({
                workspace: { id: 'ws1' },
                lastRunDay: '2026-11-22',
                name: 'Chào khách mới',
                mode: M.ONCE,
                audience: input.audience,
                text: input.text,
                imageUrl: null,
                // Who matched but was left out, for "Không gửi được".
                excluded: { CAPPED: 2 },
                createdBy: { id: 'user1' },
            });
            expect(ledger.plan).toHaveBeenCalledWith('ws1', 'send1', [
                {
                    customerId: 'lan',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-lan',
                    status: S.QUEUED,
                    skipReason: null,
                    sendDay: '2026-11-22',
                },
                {
                    customerId: 'minh',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: null,
                    status: S.SKIPPED,
                    skipReason: R.WINDOW_CLOSED,
                    sendDay: '2026-11-22',
                },
                {
                    customerId: 'hoa',
                    channel: null,
                    conversationId: null,
                    status: S.SKIPPED,
                    skipReason: R.NO_CHANNEL,
                    sendDay: '2026-11-22',
                },
            ]);
            expect(tasks.enqueue).toHaveBeenCalledWith(
                'marketing-send',
                'deliver',
                { messageId: 'm-lan' },
                { taskName: 'marketing-send-m-lan', scheduleTime: now }
            );
            expect(result).toMatchObject({
                id: 'send1',
                name: 'Chào khách mới',
            });
            // A send once never looks up who it already reached.
            expect(ledger.reachedBy).not.toHaveBeenCalled();
        });

        it('waits for the send hours, and needs the window open then', async () => {
            // 21:00 shop time: offers go out at 09:00 the next day.
            const late = new Date('2026-11-22T14:00:00.000Z');
            const before = (h: number) => new Date(late.getTime() - h * HOUR);
            conversations.lastInboundByCustomerChannel.mockResolvedValue([
                // Open until 20:00 tomorrow: still open at 09:00.
                {
                    customerId: 'lan',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-lan',
                    lastInboundAt: before(1),
                },
                // Open now, but closes at 01:00 tonight.
                {
                    customerId: 'minh',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-minh',
                    lastInboundAt: before(20),
                },
            ]);

            await service.create('ws1', input, undefined, late);

            expect(
                ledger.plan.mock.calls[0][2].map((r: any) => [
                    r.customerId,
                    r.status,
                ])
            ).toEqual([
                ['lan', S.QUEUED],
                ['minh', S.SKIPPED],
                ['hoa', S.SKIPPED],
            ]);
            expect(tasks.enqueue).toHaveBeenCalledWith(
                'marketing-send',
                'deliver',
                { messageId: 'm-lan' },
                expect.objectContaining({
                    scheduleTime: new Date('2026-11-23T02:00:00.000Z'),
                })
            );
        });

        it('reads every page of the audience before writing a row', async () => {
            const page = Array.from({ length: 500 }, (_, i) => `c${i}`);
            audience.reached
                .mockResolvedValueOnce({ ids: page, total: 501 })
                .mockResolvedValueOnce({ ids: ['last'], total: 501 });
            conversations.lastInboundByCustomerChannel.mockResolvedValue([]);
            ledger.plan.mockResolvedValue([]);

            await service.create('ws1', input, undefined, now);

            expect(audience.reached).toHaveBeenNthCalledWith(
                2,
                'ws1',
                input.audience,
                500,
                500,
                now
            );
            expect(ledger.plan.mock.calls[0][2]).toHaveLength(501);
            // The inbound lookup is paged the same way.
            expect(
                conversations.lastInboundByCustomerChannel.mock.calls.map(
                    c => c[0].length
                )
            ).toEqual([500, 1]);
        });

        it('paces each page: 30 offers a minute, pages side by side', async () => {
            const ids = Array.from({ length: 32 }, (_, i) => `c${i}`);
            audience.reached.mockResolvedValue({
                ids: [...ids, 'other'],
                total: 33,
            });
            conversations.lastInboundByCustomerChannel.mockResolvedValue([
                ...ids.map(id => ({
                    customerId: id,
                    channel: A.FACEBOOK_PAGE,
                    conversationId: `conv-${id}`,
                    accountId: 'page-1',
                    lastInboundAt: ago(1),
                })),
                {
                    customerId: 'other',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-other',
                    accountId: 'page-2',
                    lastInboundAt: ago(1),
                },
            ]);
            ledger.plan.mockImplementation(async (_w, _s, rows) =>
                rows.map((r: any) => ({
                    id: `m-${r.customerId}`,
                    customerId: r.customerId,
                    sendDay: r.sendDay,
                }))
            );

            await service.create('ws1', input, undefined, now);

            const at = new Map(
                tasks.enqueue.mock.calls.map(c => [
                    c[2].messageId,
                    c[3].scheduleTime.getTime(),
                ])
            );
            expect(at.get('m-c0')).toBe(now.getTime());
            expect(at.get('m-c29')).toBe(now.getTime());
            expect(at.get('m-c30')).toBe(now.getTime() + 60_000);
            expect(at.get('m-c31')).toBe(now.getTime() + 60_000);
            expect(at.get('m-other')).toBe(now.getTime());
        });

        it('does not pace past closing: the rest is skipped, not sent late', async () => {
            // Now is 10:00 shop time and the shop closes at 10:01.
            settings.rules.mockResolvedValue({
                maxPer30Days: 3,
                restAfter: 3,
                restDays: 30,
                sendFrom: '09:00',
                sendTo: '10:01',
            });
            const ids = Array.from({ length: 31 }, (_, i) => `c${i}`);
            audience.reached.mockResolvedValue({ ids, total: 31 });
            conversations.lastInboundByCustomerChannel.mockResolvedValue(
                ids.map(id => ({
                    customerId: id,
                    channel: A.FACEBOOK_PAGE,
                    conversationId: `conv-${id}`,
                    accountId: 'page-1',
                    lastInboundAt: ago(1),
                }))
            );
            ledger.plan.mockImplementation(async (_w, _s, rows) =>
                rows.map((r: any) => ({
                    id: `m-${r.customerId}`,
                    customerId: r.customerId,
                    sendDay: r.sendDay,
                }))
            );

            await service.create('ws1', input, undefined, now);

            expect(tasks.enqueue).toHaveBeenCalledTimes(30);
            expect(ledger.finish).toHaveBeenCalledWith('m-c30', {
                status: S.SKIPPED,
                skipReason: R.SEND_HOURS_ENDED,
            });
        });

        it('fails a row whose task could not be created, freeing the day', async () => {
            tasks.enqueue.mockRejectedValue(new Error('queue down'));

            await service.create('ws1', input, undefined, now);

            expect(ledger.finish).toHaveBeenCalledWith('m-lan', {
                status: S.FAILED,
            });
        });
    });

    describe('auto sends', () => {
        const auto = {
            id: 'send1',
            mode: M.AUTO,
            active: true,
            workspace: { id: 'ws1' },
            audience: { preset: 'ASKED_PRICE' },
        };

        beforeEach(() => {
            audience.reached.mockResolvedValue({
                ids: ['lan', 'tu'],
                total: 2,
            });
            conversations.lastInboundByCustomerChannel.mockResolvedValue([
                {
                    customerId: 'tu',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-tu',
                    accountId: 'page-1',
                    lastInboundAt: ago(1),
                },
            ]);
            ledger.plan.mockResolvedValue([]);
            sendRepository.findDueAuto.mockResolvedValue([auto]);
            sendRepository.claimRun.mockResolvedValue(true);
        });

        it('runs once a day while the send hours are open, for customers it has not reached', async () => {
            ledger.reachedBy.mockResolvedValue(new Set(['lan']));

            await service.runDueAuto(now);

            expect(sendRepository.findDueAuto).toHaveBeenCalledWith(
                '2026-11-22'
            );
            expect(sendRepository.claimRun).toHaveBeenCalledWith(
                'send1',
                '2026-11-22'
            );
            expect(ledger.reachedBy).toHaveBeenCalledWith('send1');
            expect(
                ledger.plan.mock.calls[0][2].map((r: any) => r.customerId)
            ).toEqual(['tu']);
        });

        it('waits for the send hours to open', async () => {
            // 07:00 shop time, before 09:00.
            await service.runDueAuto(new Date('2026-11-22T00:00:00.000Z'));

            expect(sendRepository.claimRun).not.toHaveBeenCalled();
            expect(ledger.plan).not.toHaveBeenCalled();
        });

        it('leaves the day to the instance that claimed it', async () => {
            sendRepository.claimRun.mockResolvedValue(false);

            await service.runDueAuto(now);

            expect(audience.reached).not.toHaveBeenCalled();
        });

        it("keeps running the other shops' sends when one fails", async () => {
            sendRepository.findDueAuto.mockResolvedValue([
                auto,
                { ...auto, id: 'send2', workspace: { id: 'ws2' } },
            ]);
            audience.reached
                .mockRejectedValueOnce(new Error('db'))
                .mockResolvedValue({ ids: ['tu'], total: 1 });

            await expect(service.runDueAuto(now)).resolves.toBeUndefined();

            expect(ledger.plan).toHaveBeenCalledWith(
                'ws2',
                'send2',
                expect.any(Array)
            );
        });
    });

    describe('update', () => {
        it('turns an AUTO send off', async () => {
            sendRepository.findOne.mockResolvedValue({
                id: 'send1',
                mode: M.AUTO,
                active: true,
            });

            const send = await service.update('send1', 'ws1', {
                active: false,
            });

            expect(send.active).toBe(false);
            expect(sendRepository.save).toHaveBeenCalled();
        });

        it('refuses to turn a send-once on or off', async () => {
            sendRepository.findOne.mockResolvedValue({
                id: 'send1',
                mode: M.ONCE,
                active: true,
            });

            await expect(
                service.update('send1', 'ws1', { active: false })
            ).rejects.toMatchObject({ status: 400 });
        });

        it("is a 404 for another workspace's send", async () => {
            sendRepository.findOne.mockResolvedValue(null);

            await expect(
                service.update('send1', 'ws1', { name: 'x' })
            ).rejects.toMatchObject({ status: 404 });
            expect(sendRepository.findOne).toHaveBeenCalledWith(
                { id: 'send1', workspace: 'ws1' },
                { populate: [] }
            );
        });
    });

    describe('deliver', () => {
        const row = (
            channel = A.FACEBOOK_PAGE,
            imageUrl: string | null = null
        ) => ({
            id: 'm1',
            channel,
            workspace: { id: 'ws1' },
            customer: { id: 'lan', name: 'Lan' },
            send: {
                id: 'send1',
                text: 'Mẫu mới về',
                imageUrl,
                audience: { preset: 'NEW' },
            },
            conversation: {
                id: 'conv-lan',
                senderId: 'psid-1',
                account: { id: 'page-1', type: channel },
                chatbot: { id: 'bot1', primaryLanguage: 'vi' },
            },
        });
        const inbound = (channel = A.FACEBOOK_PAGE, hoursAgo = 2) =>
            conversations.lastInboundByCustomerChannel.mockResolvedValue([
                {
                    customerId: 'lan',
                    channel,
                    conversationId: 'conv-lan',
                    lastInboundAt: ago(hoursAgo),
                },
            ]);

        it('does nothing for a row that is no longer queued', async () => {
            ledger.findQueued.mockResolvedValue(null);
            await service.deliver('m1', now);
            expect(messenger.sendMessage).not.toHaveBeenCalled();
            expect(ledger.finish).not.toHaveBeenCalled();
        });

        it('sends the text as the bot with a "Không nhận nữa" tap that sends the stop word', async () => {
            ledger.findQueued.mockResolvedValue(row());
            inbound();

            await service.deliver('m1', now);

            expect(messages.insertPendingOutbound).toHaveBeenCalledWith(
                'conv-lan',
                expect.any(String),
                expect.objectContaining({
                    authorType: 'BOT',
                    authorId: 'bot1',
                    text: 'Mẫu mới về',
                })
            );
            expect(messenger.sendMessage).toHaveBeenCalledWith(
                { id: 'page-1', type: A.FACEBOOK_PAGE },
                'psid-1',
                {
                    content: { kind: 'text', text: 'Mẫu mới về' },
                    fallbackText: 'Mẫu mới về',
                    quickReplies: [
                        {
                            id: 'marketing.stop',
                            label: 'Không nhận nữa',
                            value: 'dừng',
                        },
                    ],
                }
            );
            expect(messages.markOutboundSent).toHaveBeenCalledWith(
                expect.any(String),
                'mid.1'
            );
            expect(ledger.finish).toHaveBeenCalledWith('m1', {
                status: S.SENT,
                sentAt: expect.any(Date),
            });
        });

        it('says which word stops offers where there are no quick replies, after the picture', async () => {
            ledger.findQueued.mockResolvedValue(
                row(A.ZALO_PAGE, 'https://cdn/x.jpg')
            );
            inbound(A.ZALO_PAGE, 30);
            settings.stopKeyword.mockResolvedValue('huỷ');

            await service.deliver('m1', now);

            expect(zalo.sendMessage.mock.calls.map(c => c[2].content)).toEqual([
                { kind: 'media', url: 'https://cdn/x.jpg', mediaType: 'image' },
                {
                    kind: 'text',
                    text: 'Mẫu mới về\n\nNhắn "huỷ" nếu bạn không muốn nhận tin ưu đãi nữa.',
                },
            ]);
            expect(
                messages.insertPendingOutbound.mock.calls[0][2]
            ).toMatchObject({
                attachments: [{ type: 'image', url: 'https://cdn/x.jpg' }],
            });
        });

        it('keeps the stop line next to the Zalo button, which only Zalo mobile shows', async () => {
            ledger.findQueued.mockResolvedValue(row(A.ZALO_PAGE));
            inbound(A.ZALO_PAGE, 30);
            zalo.capabilities.quickReplies = true;

            await service.deliver('m1', now);
            zalo.capabilities.quickReplies = false;

            const [, , outbound] = zalo.sendMessage.mock.calls[0];
            expect(outbound.content.text).toBe(
                'Mẫu mới về\n\nNhắn "dừng" nếu bạn không muốn nhận tin ưu đãi nữa.'
            );
            expect(outbound.quickReplies).toEqual([
                expect.objectContaining({ id: 'marketing.stop' }),
            ]);
        });

        it("fills in the customer's name and product, with the product's photo", async () => {
            const base = row();
            ledger.findQueued.mockResolvedValue({
                ...base,
                send: {
                    ...base.send,
                    text: 'Chào {name}, {product} bạn hỏi vẫn còn hàng',
                    audience: { preset: 'REPURCHASE' },
                },
            });
            inbound();
            ledger.productFor.mockResolvedValue({
                name: 'Serum vitamin C',
                imageUrl: 'https://cdn/serum.jpg',
            });

            await service.deliver('m1', now);

            // A bought stage names the product bought first.
            expect(ledger.productFor).toHaveBeenCalledWith('lan', true);
            expect(
                messenger.sendMessage.mock.calls.map(c => c[2].content)
            ).toEqual([
                {
                    kind: 'media',
                    url: 'https://cdn/serum.jpg',
                    mediaType: 'image',
                },
                {
                    kind: 'text',
                    text: 'Chào Lan, Serum vitamin C bạn hỏi vẫn còn hàng',
                },
            ]);
        });

        it('falls back to plain words when the customer has no name or product', async () => {
            const base = row();
            ledger.findQueued.mockResolvedValue({
                ...base,
                customer: { id: 'lan', name: null },
                send: {
                    ...base.send,
                    text: 'Chào {name}, {product} đang giảm',
                },
            });
            inbound();

            await service.deliver('m1', now);

            expect(ledger.productFor).toHaveBeenCalledWith('lan', false);
            expect(messenger.sendMessage.mock.calls[0][2].content).toEqual({
                kind: 'text',
                text: 'Chào bạn, sản phẩm bạn quan tâm đang giảm',
            });
        });

        it('lets only the run that claims the row send it', async () => {
            ledger.findQueued.mockResolvedValue(row());
            inbound();
            ledger.claim.mockResolvedValue(false);

            await service.deliver('m1', now);

            expect(messenger.sendMessage).not.toHaveBeenCalled();
            expect(ledger.finish).not.toHaveBeenCalled();
        });

        it('skips a customer who opted out after the send was planned', async () => {
            ledger.findQueued.mockResolvedValue(row());
            ledger.isStopped.mockResolvedValue(true);

            await service.deliver('m1', now);

            expect(messenger.sendMessage).not.toHaveBeenCalled();
            expect(ledger.finish).toHaveBeenCalledWith('m1', {
                status: S.SKIPPED,
                sentAt: null,
                skipReason: R.OPTED_OUT,
            });
        });

        it('skips when the free window closed before the send went out', async () => {
            ledger.findQueued.mockResolvedValue(row());
            inbound(A.FACEBOOK_PAGE, 25);

            await service.deliver('m1', now);

            expect(messenger.sendMessage).not.toHaveBeenCalled();
            expect(ledger.finish).toHaveBeenCalledWith('m1', {
                status: S.SKIPPED,
                sentAt: null,
                skipReason: R.WINDOW_CLOSED,
            });
        });

        it('fails the row, not the task, when the channel refuses it', async () => {
            ledger.findQueued.mockResolvedValue(row());
            inbound();
            messenger.sendMessage.mockRejectedValue(
                new Error('(#10) outside window')
            );

            await expect(service.deliver('m1', now)).resolves.toBeUndefined();

            expect(messages.markOutboundFailed).toHaveBeenCalled();
            expect(ledger.finish).toHaveBeenCalledWith('m1', {
                status: S.FAILED,
                sentAt: null,
            });
        });

        it('pauses the rest of the send on that page when the platform blocks it', async () => {
            ledger.findQueued.mockResolvedValue(row());
            inbound();
            messenger.sendMessage.mockRejectedValue(
                new HttpException(
                    {
                        upstreamStatus: 400,
                        platformError: { error: { code: 2022 } },
                        message: 'x',
                    },
                    HttpStatus.BAD_GATEWAY
                )
            );

            await service.deliver('m1', now);

            expect(ledger.finish).toHaveBeenCalledWith('m1', {
                status: S.FAILED,
                sentAt: null,
            });
            expect(ledger.skipQueuedOnAccount).toHaveBeenCalledWith(
                'send1',
                'page-1'
            );
        });

        it('keeps sending to others when the failure is about one customer', async () => {
            ledger.findQueued.mockResolvedValue(row());
            inbound();
            messenger.sendMessage.mockRejectedValue(new Error('boom'));

            await service.deliver('m1', now);

            expect(ledger.skipQueuedOnAccount).not.toHaveBeenCalled();
        });
    });
});
