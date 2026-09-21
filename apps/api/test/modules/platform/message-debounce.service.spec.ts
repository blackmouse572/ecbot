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
        });
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

    it('clears pending timers on module destroy — a fired reply never runs', async () => {
        await service.schedule('conv-1', 'sender-1', 'cust-1', 'cp-1', 'hi');

        service.onModuleDestroy();
        await jest.advanceTimersByTimeAsync(MESSAGE_DEBOUNCE_MS);

        expect(replyGeneration.run).not.toHaveBeenCalled();
    });
});
