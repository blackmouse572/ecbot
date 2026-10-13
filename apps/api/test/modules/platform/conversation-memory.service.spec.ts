import {
    CONVERSATION_MEMORY_QUEUE,
    ENUM_CONVERSATION_MEMORY_PROCESS,
} from '@app/modules/platform/constants/conversation-memory.constant';
import { ConversationMemoryService } from '@app/modules/platform/services/conversation-memory.service';

const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `m-${i}` }));

/** A memory over a conversation with `unsummarized` messages after its
 *  summary; `findNewest` returns the newest `limit` of them. */
function memoryOver(
    unsummarized: number,
    conversation: object = {
        memorySummary: 'earlier',
        memorySummaryUntilId: 'cur',
    }
) {
    const all = rows(unsummarized);
    const messageRepository = {
        afterCursorFilter: jest.fn(async () => ({ f: 1 })),
        getTotal: jest.fn(async () => unsummarized),
        findNewest: jest.fn(async (_f: object, limit: number) =>
            all.slice(-limit)
        ),
    };
    const conversationRepository = {
        findOneById: jest.fn(async () => conversation),
    };
    const cloudTasks = { enqueue: jest.fn(async () => undefined) };
    const service = new ConversationMemoryService(
        messageRepository as any,
        conversationRepository as any,
        cloudTasks as any
    );
    return { service, messageRepository, cloudTasks };
}

describe('ConversationMemoryService.window', () => {
    it('returns the summary and every unsummarized message up to the max', async () => {
        const { service, messageRepository, cloudTasks } = memoryOver(40);

        const window = await service.window('c');

        expect(messageRepository.afterCursorFilter).toHaveBeenCalledWith(
            'c',
            'cur'
        );
        expect(window.summary).toBe('earlier');
        expect(window.rows).toHaveLength(40);
        expect(cloudTasks.enqueue).not.toHaveBeenCalled();
    });

    it('loads the burst on top of the window, so it never eats into the history', async () => {
        // 503 rows, the newest 3 the burst: 500 history rows keep 20.
        const { service } = memoryOver(503);
        const window = await service.window('c', 3);
        expect(window.rows.map(r => r.id)).toEqual(
            rows(503)
                .slice(480)
                .map(r => r.id)
        );
    });

    it('drops a whole step past the max and asks for it to be summarized', async () => {
        const { service, cloudTasks } = memoryOver(45);

        const window = await service.window('c');

        expect(window.rows.map(r => r.id)).toEqual(
            rows(45)
                .slice(20)
                .map(r => r.id)
        );
        expect(cloudTasks.enqueue).toHaveBeenCalledWith(
            CONVERSATION_MEMORY_QUEUE,
            ENUM_CONVERSATION_MEMORY_PROCESS.SUMMARIZE,
            {
                conversationId: 'c',
                fromMessageId: 'cur',
                untilMessageId: 'm-19',
            },
            { taskName: 'summarize-c-m-19' }
        );
    });

    it('still answers the Turn when the summary cannot be queued', async () => {
        const { service, cloudTasks } = memoryOver(45);
        cloudTasks.enqueue.mockRejectedValue(new Error('no queue'));

        await expect(service.window('c')).resolves.toMatchObject({
            rows: expect.any(Array),
        });
    });

    it('reads from the start when there is no summary yet', async () => {
        const { service, messageRepository } = memoryOver(3, {});

        const window = await service.window('c');

        expect(messageRepository.afterCursorFilter).toHaveBeenCalledWith(
            'c',
            undefined
        );
        expect(window.summary).toBeUndefined();
        expect(window.rows).toHaveLength(3);
    });
});
