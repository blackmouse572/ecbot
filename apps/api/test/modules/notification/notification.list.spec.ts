import { NotificationService } from '@app/modules/notification/services/notification.service';

describe('NotificationService.findAllByRecipient', () => {
    it('scopes to the recipient and passes paging and order through', async () => {
        const repository = { find: jest.fn().mockResolvedValue([]) };
        const service = new NotificationService(
            repository as any,
            {} as any,
            {} as any
        );

        await service.findAllByRecipient(
            'u-1',
            { status: 'unread' },
            {
                paging: { limit: 20, offset: 40 },
                order: { createdAt: 'desc' } as any,
            }
        );

        expect(repository.find).toHaveBeenCalledWith(
            { status: 'unread', recipient: 'u-1' },
            expect.objectContaining({
                paging: { limit: 20, offset: 40 },
                order: { createdAt: 'desc' },
            })
        );
    });
});
