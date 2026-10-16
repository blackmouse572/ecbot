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
        ).resolves.toEqual({ status: 'skipped', reason: 'no_texts' });
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
        const outcome = await svc.run({
            conversationId: 'c',
            senderId: 's',
            customerId: 'cu',
            contactPointId: 'cp',
            texts: ['hi'],
        });
        expect(lease.current).toHaveBeenCalledWith('c');
        expect(outcome).toEqual({
            status: 'skipped',
            reason: 'no_conversation',
        });
    });

    /** A service whose Turn context is `context`; apps/ai's stream fails. */
    function serviceWith(
        context: object,
        meter?: object,
        options: { capabilities?: object; typingIndicator?: boolean } = {}
    ) {
        const streamChat = jest.fn().mockRejectedValue(new Error('stop'));
        const turnContext = { build: jest.fn().mockResolvedValue(context) };
        const svc = new ReplyGenerationService(
            {
                findOne: jest.fn().mockResolvedValue({
                    id: 'acc-1',
                    type: 'TELEGRAM_BOT',
                    chatbot: {
                        id: 'bot-1',
                        workspace: { id: 'ws-1' },
                        typingIndicator: options.typingIndicator,
                    },
                }),
            } as any,
            { streamChat } as any,
            {
                findLatestInbound: jest.fn().mockResolvedValue({ id: 'm-1' }),
            } as any,
            {
                get: () => ({
                    capabilities: options.capabilities ?? { typing: true },
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

    // The edge logs a non-2xx /poc/reply; a swallowed stream error used to
    // look like success, so the silent bot left no trace anywhere.
    it('reports a failed stream as failed, not as done', async () => {
        const { run } = serviceWith({ history: [], message: 'x' });

        await expect(run()).resolves.toEqual({
            status: 'failed',
            reason: 'stream_failed',
        });
    });

    // Out of quota with no fallback line is silence the owner chose, not a
    // failure: a 502 there made the edge log errors for it.
    it('reports an exhausted budget with no fallback message as skipped', async () => {
        const meter = {
            check: jest
                .fn()
                .mockResolvedValue({ allowed: false, reason: 'quota' }),
            record: jest.fn(),
        };
        const { run, streamChat } = serviceWith(
            { history: [], message: 'x' },
            meter
        );

        await expect(run()).resolves.toEqual({
            status: 'skipped',
            reason: 'no_fallback_configured',
        });
        expect(streamChat).not.toHaveBeenCalled();
    });

    // Telegram drops a chat action after 5s; the 9s default left the
    // customer without a typing indicator for long stretches (#181).
    it("re-sends the typing indicator at the adapter's own interval", async () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        const { run } = serviceWith({ history: [], message: 'x' }, undefined, {
            capabilities: { typing: true, typingRefreshMs: 4000 },
            typingIndicator: true,
        });

        await run();

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 4000);
        setIntervalSpy.mockRestore();
    });

    it('never re-sends typing faster than once a second', async () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        const { run } = serviceWith({ history: [], message: 'x' }, undefined, {
            capabilities: { typing: true, typingRefreshMs: 0 },
            typingIndicator: true,
        });

        await run();

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
        setIntervalSpy.mockRestore();
    });

    it('falls back to the default typing interval', async () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        const { run } = serviceWith({ history: [], message: 'x' }, undefined, {
            typingIndicator: true,
        });

        await run();

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 9000);
        setIntervalSpy.mockRestore();
    });

    // #250: describing the burst's images is a model call too. A blocked
    // turn must not run it and leave its tokens unrecorded.
    it('describes no images when the budget blocks the turn', async () => {
        const meter = {
            check: jest
                .fn()
                .mockResolvedValue({ allowed: false, reason: 'quota' }),
            record: jest.fn(),
        };
        const { run, turnContext } = serviceWith(
            { history: [], message: 'x' },
            meter
        );

        await run();

        expect(turnContext.build).not.toHaveBeenCalled();
        expect(meter.record).not.toHaveBeenCalled();
    });

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
            { texts: ['giá bao nhiêu?'], messageIds: undefined },
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
    // #286: the operator view shows what the agent did for a channel reply.
    describe('agent activity', () => {
        const activities = [
            { kind: 'SKILL', label: 'refunds', at: new Date() },
        ];

        function deliveringService(
            anySent: boolean,
            endedWithoutReply = false,
            delivered: object[] = activities
        ) {
            const conversations = {
                findOneById: jest.fn().mockResolvedValue({
                    botEnabled: true,
                    account: 'acc-1',
                }),
                resetFallbackCount: jest.fn(),
                recordFallback: jest.fn().mockResolvedValue({
                    triggered: false,
                }),
                recordActivities: jest.fn().mockResolvedValue(undefined),
            };
            const svc = new ReplyGenerationService(
                {
                    findOne: jest.fn().mockResolvedValue({
                        id: 'acc-1',
                        type: 'FACEBOOK_PAGE',
                        chatbot: { id: 'bot-1', workspace: { id: 'ws-1' } },
                    }),
                } as any,
                { streamChat: jest.fn().mockResolvedValue({}) } as any,
                {
                    findLatestInbound: jest
                        .fn()
                        .mockResolvedValue({ id: 'm-1' }),
                } as any,
                { get: () => ({ startTyping: jest.fn() }) } as any,
                {
                    current: jest.fn().mockResolvedValue(1),
                    isCurrent: jest.fn().mockResolvedValue(true),
                } as any,
                {
                    deliver: jest.fn().mockResolvedValue({
                        anySent,
                        superseded: false,
                        guardrailBlocked: false,
                        guardrailReason: '',
                        generationFailed: false,
                        activities: delivered,
                        endedWithoutReply,
                    }),
                } as any,
                { get: jest.fn(() => conversations) } as any,
                { em: { fork: () => ({}) } } as any,
                { build: jest.fn().mockResolvedValue([]) } as any,
                {
                    build: jest
                        .fn()
                        .mockResolvedValue({ history: [], message: 'x' }),
                } as any
            );
            const run = () =>
                svc.run({
                    conversationId: 'c',
                    senderId: 's',
                    customerId: 'cu',
                    contactPointId: 'cp',
                    texts: ['hoàn tiền?'],
                });
            return { run, conversations };
        }

        it('records what the agent did once the reply reached the customer', async () => {
            const { run, conversations } = deliveringService(true);

            await run();

            expect(conversations.recordActivities).toHaveBeenCalledWith(
                'c',
                activities
            );
        });

        it('records only the silence for a turn the agent ended without a reply', async () => {
            const noReply = {
                kind: 'NO_REPLY',
                label: 'customer said ok',
                at: new Date(),
            };
            const { run, conversations } = deliveringService(false, true, [
                ...activities,
                noReply,
            ]);

            await run();

            // Its other steps would splice under the next, unrelated reply.
            expect(conversations.recordActivities).toHaveBeenCalledWith('c', [
                noReply,
            ]);
        });

        it('sends no fallback when the agent chose to end without a reply', async () => {
            const { run, conversations } = deliveringService(false, true);

            await expect(run()).resolves.toEqual({
                status: 'skipped',
                reason: 'ended_without_reply',
            });
            expect(conversations.recordFallback).not.toHaveBeenCalled();
        });

        it('records nothing when no reply was sent', async () => {
            const { run, conversations } = deliveringService(false);

            await run();

            expect(conversations.recordActivities).not.toHaveBeenCalled();
        });
    });
});
