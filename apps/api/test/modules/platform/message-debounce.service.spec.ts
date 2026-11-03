import { MessageDebounceService } from '../../../src/modules/platform/services/message-debounce.service';
import { MESSAGE_DEBOUNCE_MS } from '../../../src/modules/platform/constants/message-debounce.constant';

describe('MessageDebounceService (in-process)', () => {
    const lease = { bump: jest.fn().mockResolvedValue(1) };
    const replyGeneration = { run: jest.fn().mockResolvedValue(undefined) };

    let service: MessageDebounceService;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        service = new MessageDebounceService(
            lease as any,
            replyGeneration as any
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('bumps the lease immediately on schedule', async () => {
        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'hi');
        expect(lease.bump).toHaveBeenCalledWith('conv-1');
    });

    it('fires the reply after the debounce window with the buffered text', async () => {
        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'hi');
        expect(replyGeneration.run).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);

        expect(replyGeneration.run).toHaveBeenCalledWith({
            conversationId: 'conv-1',
            senderId: 'sender-1',
            customerId: 'cust-1',
            contactPointId: 'cp-1',
            texts: ['hi'],
            messageIds: [],
        });
    });

    // The Turn finds the burst's rows by id: counting the last rows breaks
    // when another message is saved before the Turn reads them.
    it("carries the ids of the burst's saved messages to the reply", async () => {
        await service.schedule(
            'conv-1',
            'sender-1',
            'cust-1',
            'cp-1',
            '',
            'm-1'
        );
        await service.schedule(
            'conv-1',
            'sender-1',
            'cust-1',
            'cp-1',
            '',
            'm-2'
        );

        await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);
        expect(replyGeneration.run).toHaveBeenCalledWith(
            expect.objectContaining({
                texts: ['', ''],
                messageIds: ['m-1', 'm-2'],
            })
        );
    });

    it('coalesces a burst of messages into a single reply, resetting the window each time', async () => {
        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'hi');
        await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS - 500);
        await service.schedule(
            'conv-1',
            'sender-1',
            'cust-1',
            'cp-1',
            'still there?'
        );

        // Original window would have fired by now — the reset must have held it off.
        await jest.advanceTimersByTimeAsync(500);
        expect(replyGeneration.run).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS - 500);
        expect(replyGeneration.run).toHaveBeenCalledTimes(1);
        expect(replyGeneration.run).toHaveBeenCalledWith(
            expect.objectContaining({ texts: ['hi', 'still there?'] })
        );
    });

    it('tracks separate conversations independently', async () => {
        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'a');
        await service.schedule('conv-2', 'sender-2', 'cust-2', 'cp-2', 'b');

        await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);

        expect(replyGeneration.run).toHaveBeenCalledTimes(2);
        expect(replyGeneration.run).toHaveBeenCalledWith(
            expect.objectContaining({ conversationId: 'conv-1', texts: ['a'] })
        );
        expect(replyGeneration.run).toHaveBeenCalledWith(
            expect.objectContaining({ conversationId: 'conv-2', texts: ['b'] })
        );
    });

    it('logs and does not throw when the reply generation fails', async () => {
        replyGeneration.run.mockRejectedValueOnce(new Error('boom'));

        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'hi');
        await expect(
            jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS)
        ).resolves.toBeUndefined();
    });

    it('does not throw when the reply generation rejects with a non-Error value', async () => {
        replyGeneration.run.mockRejectedValueOnce('boom');

        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'hi');
        await expect(
            jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS)
        ).resolves.toBeUndefined();
    });

    describe('while a reply runs', () => {
        /** A reply that stays open until `finish(outcome)` is called. */
        function openReply() {
            let finish!: (outcome: object) => void;
            replyGeneration.run.mockImplementationOnce(
                () => new Promise(resolve => (finish = resolve))
            );
            return (outcome: object) => finish(outcome);
        }
        const send = (text: string, id: string) =>
            service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', text, id);

        it('holds a newer message until the reply ends, then answers it', async () => {
            const finish = openReply();
            await send('áo trắng M còn không', 'm-1');
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);

            await send('có màu đen không', 'm-2');
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS * 3);
            expect(replyGeneration.run).toHaveBeenCalledTimes(1);

            finish({ status: 'delivered' });
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);
            expect(replyGeneration.run).toHaveBeenCalledTimes(2);
            expect(replyGeneration.run).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    texts: ['có màu đen không'],
                    messageIds: ['m-2'],
                })
            );
        });

        it('answers only what the reply did not steer in', async () => {
            const finish = openReply();
            await send('áo trắng M còn không', 'm-1');
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);
            await send('có màu đen không', 'm-2');
            await send('', 'm-3');

            finish({ status: 'delivered', steeredMessageIds: ['m-2'] });
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);
            expect(replyGeneration.run).toHaveBeenLastCalledWith(
                expect.objectContaining({ texts: [''], messageIds: ['m-3'] })
            );
        });

        it('starts no follow-up when the reply steered in everything', async () => {
            const finish = openReply();
            await send('áo trắng M còn không', 'm-1');
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);
            await send('có màu đen không', 'm-2');

            finish({ status: 'delivered', steeredMessageIds: ['m-2'] });
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS * 3);
            expect(replyGeneration.run).toHaveBeenCalledTimes(1);
        });

        it('still answers held messages when the reply fails', async () => {
            replyGeneration.run.mockRejectedValueOnce(new Error('boom'));
            await send('áo trắng M còn không', 'm-1');
            await send('có màu đen không', 'm-2');
            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);
            await send('size L', 'm-3');

            await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);
            expect(replyGeneration.run).toHaveBeenCalledTimes(2);
        });
    });

    it('clears pending timers on module destroy — a fired reply never runs', async () => {
        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'hi');

        service.onModuleDestroy();
        await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);

        expect(replyGeneration.run).not.toHaveBeenCalled();
    });
});
