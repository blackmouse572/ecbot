import { ENUM_ACCOUNT_TYPE as A } from 'src/modules/account/enums/account.enum';
import {
    ENUM_MARKETING_MESSAGE_STATUS as S,
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
    };
    const ledger = {
        plan: jest.fn(),
        stats: jest.fn(),
        findQueued: jest.fn(),
        isStopped: jest.fn(),
        finish: jest.fn(),
        claim: jest.fn(),
        markReplied: jest.fn(),
    };
    const audience = { toAudience: jest.fn(a => a), reached: jest.fn() };
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
        audience: { preset: 'NEW' } as any,
        text: 'Mẫu mới về, giảm 20% hôm nay',
    };

    beforeEach(() => {
        jest.resetAllMocks();
        audience.toAudience.mockImplementation(a => a);
        sendRepository.create.mockResolvedValue({ id: 'send1' });
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

    describe('send', () => {
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
                    lastInboundAt: ago(2),
                },
                {
                    customerId: 'minh',
                    channel: A.FACEBOOK_PAGE,
                    conversationId: 'conv-minh',
                    lastInboundAt: ago(30),
                },
            ]);
            ledger.plan.mockResolvedValue([
                { id: 'm-lan', customerId: 'lan', sendDay: '2026-11-22' },
            ]);
        });

        it('queues customers on a free channel and keeps why the rest were skipped', async () => {
            const result = await service.send('ws1', input, 'user1', now);

            expect(sendRepository.create).toHaveBeenCalledWith({
                workspace: { id: 'ws1' },
                audience: input.audience,
                text: input.text,
                imageUrl: null,
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
            expect(result).toEqual({ id: 'send1', queued: 1 });
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

            await service.send('ws1', input, undefined, late);

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

            await service.send('ws1', input, undefined, now);

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

        it('fails a row whose task could not be created, freeing the day', async () => {
            tasks.enqueue.mockRejectedValue(new Error('queue down'));

            await service.send('ws1', input, undefined, now);

            expect(ledger.finish).toHaveBeenCalledWith('m-lan', {
                status: S.FAILED,
            });
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
            customer: { id: 'lan' },
            send: { text: 'Mẫu mới về', imageUrl },
            conversation: {
                id: 'conv-lan',
                senderId: 'psid-1',
                account: { type: channel },
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
                { type: A.FACEBOOK_PAGE },
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
    });
});
