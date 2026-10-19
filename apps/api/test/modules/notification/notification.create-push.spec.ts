import { NotificationType } from '@app/modules/notification/enums/notification.enum';
import { NotificationService } from '@app/modules/notification/services/notification.service';

describe('NotificationService.create push', () => {
    const saved = { id: 'n-1', title: 'Hi', message: 'There' };
    const repository = { create: jest.fn(async () => saved) };
    const dto = {
        title: 'Hi',
        message: 'There',
        type: NotificationType.INFO,
        recipient: 'user-1',
    };

    beforeEach(() => jest.clearAllMocks());

    it('pushes every saved notification to the recipient devices', async () => {
        const push = { sendToUser: jest.fn(async () => undefined) };
        const service = new NotificationService(
            repository as any,
            {} as any,
            {} as any,
            push as any
        );

        await expect(service.create(dto as any)).resolves.toBe(saved);

        expect(push.sendToUser).toHaveBeenCalledWith('user-1', saved);
    });

    it('keeps the in-app notification when the push fails', async () => {
        const push = {
            sendToUser: jest.fn(async () => {
                throw new Error('push down');
            }),
        };
        const service = new NotificationService(
            repository as any,
            {} as any,
            {} as any,
            push as any
        );

        await expect(service.create(dto as any)).resolves.toBe(saved);
    });
});
