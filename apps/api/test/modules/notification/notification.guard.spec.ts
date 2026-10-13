import { NotificationGuard } from '@app/modules/notification/guard/notification.guard';
import { NotificationEntity } from '@app/modules/notification/repository/entities/notification.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { ExecutionContext, NotFoundException } from '@nestjs/common';

describe('NotificationGuard', () => {
    const notificationFor = (recipientId: string) => {
        const recipient = new UserEntity();
        recipient.id = recipientId;
        const notification = new NotificationEntity();
        notification.recipient = recipient;
        return notification;
    };
    const contextFor = (userId: string) =>
        ({
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { user: userId },
                    params: { notification: 'n-1' },
                }),
            }),
        }) as unknown as ExecutionContext;

    it('lets the recipient through', async () => {
        const guard = new NotificationGuard({
            findOneById: jest.fn().mockResolvedValue(notificationFor('u-1')),
        } as any);

        await expect(guard.canActivate(contextFor('u-1'))).resolves.toBe(true);
    });

    it('hides the notification from anyone else', async () => {
        const guard = new NotificationGuard({
            findOneById: jest.fn().mockResolvedValue(notificationFor('u-1')),
        } as any);

        await expect(guard.canActivate(contextFor('u-2'))).rejects.toThrow(
            NotFoundException
        );
    });
});
