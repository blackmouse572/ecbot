import { NotificationPushService } from '@app/modules/notification/services/notification.push.service';
import webpush from 'web-push';

jest.mock('web-push', () => ({
    __esModule: true,
    default: { sendNotification: jest.fn() },
}));

const send = webpush.sendNotification as jest.Mock;

const config = (values: Record<string, string | undefined>) => ({
    get: jest.fn((key: string) => values[key]),
});

const keys = {
    'webPush.publicKey': 'BPublic',
    'webPush.privateKey': 'private',
    'webPush.subject': 'mailto:support@ecbot.vn',
};

const subscription = (endpoint: string) => ({
    id: `sub-${endpoint}`,
    endpoint,
    p256dh: 'p256dh-key',
    auth: 'auth-key',
});

describe('NotificationPushService', () => {
    const repository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        deleteMany: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        send.mockResolvedValue({ statusCode: 201 });
    });

    describe('publicKey', () => {
        it('is the VAPID public key when push is configured', () => {
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );
            expect(service.publicKey()).toBe('BPublic');
        });

        it('is null when any VAPID value is missing, so the app hides push', () => {
            const service = new NotificationPushService(
                repository as any,
                config({ ...keys, 'webPush.privateKey': undefined }) as any
            );
            expect(service.publicKey()).toBeNull();
        });
    });

    describe('sendToUser', () => {
        const notification = {
            id: 'n-1',
            title: 'Customer needs a person',
            message: 'Asked for staff',
            metadata: { actionUrl: '/shop/conversations/c-1' },
        };

        it('sends the notification to every device of the recipient', async () => {
            repository.find.mockResolvedValue([
                subscription('https://push/a'),
                subscription('https://push/b'),
            ]);
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.sendToUser('user-1', notification as any);

            expect(repository.find).toHaveBeenCalledWith({
                user: 'user-1',
            });
            expect(send).toHaveBeenCalledTimes(2);
            const [target, payload, options] = send.mock.calls[0];
            expect(target).toEqual({
                endpoint: 'https://push/a',
                keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
            });
            expect(JSON.parse(payload)).toEqual({
                id: 'n-1',
                title: 'Customer needs a person',
                body: 'Asked for staff',
                url: '/shop/conversations/c-1',
            });
            expect(options.vapidDetails).toEqual({
                subject: 'mailto:support@ecbot.vn',
                publicKey: 'BPublic',
                privateKey: 'private',
            });
        });

        it('forgets a device the push service says is gone', async () => {
            repository.find.mockResolvedValue([
                subscription('https://push/gone'),
                subscription('https://push/ok'),
            ]);
            send.mockImplementation(({ endpoint }) =>
                endpoint === 'https://push/gone'
                    ? Promise.reject({ statusCode: 410 })
                    : Promise.resolve({ statusCode: 201 })
            );
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.sendToUser('user-1', notification as any);

            expect(repository.deleteMany).toHaveBeenCalledWith({
                id: { $in: ['sub-https://push/gone'] },
            });
        });

        it('never throws when a push fails for another reason', async () => {
            repository.find.mockResolvedValue([subscription('https://push/a')]);
            send.mockRejectedValue({ statusCode: 500 });
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await expect(
                service.sendToUser('user-1', notification as any)
            ).resolves.toBeUndefined();
            expect(repository.deleteMany).not.toHaveBeenCalled();
        });

        it('does nothing when push is not configured', async () => {
            const service = new NotificationPushService(
                repository as any,
                config({}) as any
            );

            await service.sendToUser('user-1', notification as any);

            expect(repository.find).not.toHaveBeenCalled();
            expect(send).not.toHaveBeenCalled();
        });
    });

    describe('subscribe', () => {
        const body = {
            endpoint: 'https://push/a',
            keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        };

        it('saves a new device for the user', async () => {
            repository.findOne.mockResolvedValue(null);
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.subscribe('user-1', body, 'Chrome');

            expect(repository.create).toHaveBeenCalledWith({
                user: 'user-1',
                endpoint: 'https://push/a',
                p256dh: 'p256dh-key',
                auth: 'auth-key',
                userAgent: 'Chrome',
            });
        });

        it('moves a known device to whoever signed in on it last', async () => {
            const existing = {
                ...subscription('https://push/a'),
                user: 'user-old',
            };
            repository.findOne.mockResolvedValue(existing);
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.subscribe('user-1', body, 'Chrome');

            expect(repository.create).not.toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'user-1',
                    endpoint: 'https://push/a',
                })
            );
        });
    });

    it('unsubscribe removes only that device of that user', async () => {
        const service = new NotificationPushService(
            repository as any,
            config(keys) as any
        );

        await service.unsubscribe('user-1', 'https://push/a');

        expect(repository.deleteMany).toHaveBeenCalledWith({
            user: 'user-1',
            endpoint: 'https://push/a',
        });
    });
});
