import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';

describe('ReplyGenerationService.run', () => {
    it('no-ops when texts is empty', async () => {
        const svc = new ReplyGenerationService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        );
        await expect(
            svc.run({
                conversationId: 'c',
                senderId: 's',
                customerId: 'cu',
                contactPointId: 'cp',
                texts: [],
            })
        ).resolves.toBeUndefined();
    });

    it('captures the current lease epoch before streaming', async () => {
        const lease = {
            current: jest.fn().mockResolvedValue(5),
            isCurrent: jest.fn().mockResolvedValue(true),
        };
        const conversationService = {
            findOneById: jest.fn().mockResolvedValue(null),
        };
        const moduleRef = { get: jest.fn(() => conversationService) };
        const svc = new ReplyGenerationService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            lease as any,
            {} as any,
            moduleRef as any,
            { em: { fork: () => ({}) } } as any,
            {} as any,
            {} as any,
            {} as any
        );
        await svc.run({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: ['hi'],
        });
        expect(lease.current).toHaveBeenCalledWith('c');
    });

    /** A service whose Turn context is `context`; apps/ai's stream fails. */
    function serviceWith(context: object, meter?: object) {
        const streamChat = jest.fn().mockRejectedValue(new Error('stop'));
        const turnContext = { build: jest.fn().mockResolvedValue(context) };
        const svc = new ReplyGenerationService(
            {
                findOne: jest.fn().mockResolvedValue({
                    id: 'acc-1',
                    type: 'TELEGRAM_BOT',
                    chatbot: { id: 'bot-1', workspace: { id: 'ws-1' } },
                }),
            } as any,
            { streamChat } as any,
            {
                findLatestInbound: jest.fn().mockResolvedValue({ id: 'm-1' }),
            } as any,
            {
                get: () => ({
                    startTyping: jest.fn().mockResolvedValue(undefined),
                }),
            } as any,
            { current: jest.fn().mockResolvedValue(1) } as any,
            {} as any,
            {
                get: jest.fn(() => ({
                    findOneById: jest.fn().mockResolvedValue({
                        botEnabled: true,
                        account: 'acc-1',
                    }),
                })),
            } as any,
            { em: { fork: () => ({}) } } as any,
            { build: jest.fn().mockResolvedValue([]) } as any,
            turnContext as any,
            meter as any
        );
        const run = () =>
            svc.run({
                conversationId: 'c',
                senderId: 's',
                customerId: 'cu',
                contactPointId: 'cp',
                texts: ['giá bao nhiêu?'],
            });
        return { run, streamChat, turnContext };
    }

    // Burst and history rules are TurnContextService's (its own spec); here
    // only that the Turn sends apps/ai what the context built.
    it('sends apps/ai the Turn context for the burst', async () => {
        const context = {
            history: [{ role: 'user', content: 'earlier' }],
            message: 'giá bao nhiêu?\n[Image description: A shirt]',
        };
        const { run, streamChat, turnContext } = serviceWith(context);

        await run();

        expect(turnContext.build).toHaveBeenCalledWith(
            'c',
            ['giá bao nhiêu?'],
            'bot-1'
        );
        expect(streamChat.mock.calls[0][0]).toEqual(
            expect.objectContaining(context)
        );
    });

    // The vision tokens were spent describing the burst, whatever happens
    // to the reply after.
    it('bills describing the images even when the reply fails', async () => {
        const usage = { inputTokens: 900, outputTokens: 60, totalTokens: 960 };
        const meter = {
            check: jest.fn().mockResolvedValue({ allowed: true }),
            record: jest.fn().mockResolvedValue(undefined),
        };
        const { run } = serviceWith(
            { history: [], message: 'x', usage },
            meter
        );

        await run();

        expect(meter.record).toHaveBeenCalledWith(
            expect.objectContaining({ usage })
        );
    });
});
