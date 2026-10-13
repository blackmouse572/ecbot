import { ConversationMemoryService } from '@app/modules/platform/services/conversation-memory.service';

const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `m-${i}` }));

/** A memory over a conversation with `total` messages; `findNewest` returns
 *  the newest `limit` of them. */
function memoryOver(total: number) {
    const all = rows(total);
    const messageRepository = {
        afterCursorFilter: jest.fn(async () => ({ f: 1 })),
        countWhere: jest.fn(async () => total),
        findNewest: jest.fn(async (_f: object, limit: number) =>
            all.slice(-limit)
        ),
    };
    return new ConversationMemoryService(messageRepository as any);
}

describe('ConversationMemoryService.window', () => {
    it('returns every message up to the max', async () => {
        const window = await memoryOver(40).window('c');
        expect(window.rows).toHaveLength(40);
    });

    it('drops whole steps past the max', async () => {
        const window = await memoryOver(45).window('c');
        expect(window.rows.map(r => r.id)).toEqual(
            rows(45)
                .slice(20)
                .map(r => r.id)
        );
    });
});
