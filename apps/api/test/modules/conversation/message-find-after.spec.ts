import { MessageRepository } from '../../../src/modules/conversation/repository/repositories/message.repository';

function makeRepository() {
    const find = jest.fn(async () => []);
    const findOne = jest.fn(async () => null);
    const repo = Object.create(MessageRepository.prototype) as MessageRepository;
    (repo as any).find = find;
    (repo as any).findOne = findOne;
    return { repo, find, findOne };
}

describe('MessageRepository.findAfter', () => {
    it('returns the whole thread in chronological order when no cursor is given', async () => {
        const { repo, find } = makeRepository();

        await repo.findAfter('conv-1', undefined, 50);

        const [where, options] = find.mock.calls[0] as any;
        expect(where).toMatchObject({
            conversation: 'conv-1',
            deletedAt: null,
        });
        expect(options.orderBy).toEqual({ dateSent: 'ASC', id: 'ASC' });
        expect(options.paging).toEqual({ limit: 50, offset: 0 });
    });

    it('filters to messages sent after the cursor message', async () => {
        const { repo, find, findOne } = makeRepository();
        const cursorSentAt = new Date('2026-09-04T10:00:00.000Z');
        findOne.mockResolvedValue({
            id: 'msg-5',
            dateSent: cursorSentAt,
        } as any);

        await repo.findAfter('conv-1', 'msg-5', 50);

        const [where] = find.mock.calls[0] as any;
        expect(where.$or).toEqual([
            { dateSent: { $gt: cursorSentAt } },
            { dateSent: cursorSentAt, id: { $gt: 'msg-5' } },
        ]);
    });

    it('breaks ties on id so a same-millisecond message is never skipped', async () => {
        // Two messages written in the same millisecond can straddle a page
        // boundary. A cursor on dateSent alone would exclude the trailing one
        // from every later poll — silent, permanent loss.
        const { repo, find, findOne } = makeRepository();
        const sameMs = new Date('2026-09-04T10:00:00.000Z');
        findOne.mockResolvedValue({ id: 'msg-a', dateSent: sameMs } as any);

        await repo.findAfter('conv-1', 'msg-a', 50);

        const [where, options] = find.mock.calls[0] as any;
        expect(where.$or[1]).toEqual({
            dateSent: sameMs,
            id: { $gt: 'msg-a' },
        });
        // The tie-break only holds if the sort agrees with the cursor.
        expect(options.orderBy).toEqual({ dateSent: 'ASC', id: 'ASC' });
    });

    it('scopes the cursor lookup to the conversation so a foreign id cannot seek', async () => {
        const { repo, findOne } = makeRepository();

        await repo.findAfter('conv-1', 'msg-from-elsewhere', 50);

        const [where] = findOne.mock.calls[0] as any;
        expect(where).toMatchObject({
            id: 'msg-from-elsewhere',
            conversation: 'conv-1',
        });
    });

    it('falls back to the full thread when the cursor is not found', async () => {
        const { repo, find, findOne } = makeRepository();
        findOne.mockResolvedValue(null);

        await repo.findAfter('conv-1', 'gone', 50);

        const [where] = find.mock.calls[0] as any;
        expect(where.dateSent).toBeUndefined();
        expect(where.$or).toBeUndefined();
    });
});
