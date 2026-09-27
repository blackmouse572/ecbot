import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';

describe('MessageRepository.updateAttachments', () => {
    // A single UPDATE: the Turn's other pending writes are not flushed with it.
    it('replaces the attachments with one native update', async () => {
        const repo = Object.create(MessageRepository.prototype) as any;
        repo.updateRaw = jest.fn().mockResolvedValue(1);
        const attachments = [
            {
                type: 'image',
                key: 'k.jpg',
                description: 'A flyer: Yoga, Sat 9am',
            },
        ];

        await repo.updateAttachments('m-1', attachments);

        expect(repo.updateRaw).toHaveBeenCalledWith(
            { id: 'm-1' },
            { attachments }
        );
    });
});
