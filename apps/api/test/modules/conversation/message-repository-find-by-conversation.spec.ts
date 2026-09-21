import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';

describe('MessageRepository.findByConversation', () => {
    it('returns the most-recent page (newest-first from DB) in chronological order', async () => {
        // DB returns newest-first for a DESC query; the repository must reverse
        // it so callers get the recent window in oldest→newest reading order.
        const descRows = [
            { id: 'm3', dateSent: new Date('2026-01-03') },
            { id: 'm2', dateSent: new Date('2026-01-02') },
            { id: 'm1', dateSent: new Date('2026-01-01') },
        ];
        const find = jest.fn().mockResolvedValue(descRows);
        const repo = Object.create(MessageRepository.prototype) as any;
        repo.find = find;

        const result = await repo.findByConversation('conv-1', {
            limit: 3,
            offset: 0,
        });

        // chronological: oldest first
        expect(result.map((m: any) => m.id)).toEqual(['m1', 'm2', 'm3']);

        // queried newest-first, with the requested paging window
        expect(find).toHaveBeenCalledWith(
            { conversation: 'conv-1', deletedAt: null },
            expect.objectContaining({
                orderBy: { dateSent: 'DESC' },
                paging: { limit: 3, offset: 0 },
            })
        );
    });
});
