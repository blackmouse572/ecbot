import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';

describe('MessageRepository.describeImages', () => {
    it('stores the description on the message’s image attachments only', async () => {
        const repo = Object.create(MessageRepository.prototype) as any;
        repo.findOneById = jest.fn().mockResolvedValue({
            id: 'm-1',
            attachments: [
                { type: 'image', key: 'k.jpg' },
                { type: 'video', url: 'https://cdn/v.mp4' },
            ],
        });
        repo.updateEntity = jest.fn();

        await repo.describeImages('m-1', 'A flyer: Yoga class, Sat 9am');

        expect(repo.updateEntity).toHaveBeenCalledWith(
            { id: 'm-1' },
            {
                attachments: [
                    {
                        type: 'image',
                        key: 'k.jpg',
                        description: 'A flyer: Yoga class, Sat 9am',
                    },
                    { type: 'video', url: 'https://cdn/v.mp4' },
                ],
            }
        );
    });

    it('does nothing for a missing message', async () => {
        const repo = Object.create(MessageRepository.prototype) as any;
        repo.findOneById = jest.fn().mockResolvedValue(null);
        repo.updateEntity = jest.fn();

        await repo.describeImages('gone', 'x');

        expect(repo.updateEntity).not.toHaveBeenCalled();
    });
});
