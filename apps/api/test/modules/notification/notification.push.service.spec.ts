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
        findBeyondNewest: jest.fn(),
        userReference: jest.fn((id: string) => ({ id })),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        send.mockReset().mockResolvedValue({ statusCode: 201 });
        repository.findBeyondNewest.mockResolvedValue([]);
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

        it('sends to many devices a few at a time', async () => {
            repository.find.mockResolvedValue(
                Array.from({ length: 25 }, (_, i) =>
                    subscription(`https://push/${i}`)
                )
            );
            let inFlight = 0;
            let peak = 0;
            send.mockImplementation(async () => {
                peak = Math.max(peak, ++inFlight);
                await new Promise(resolve => setImmediate(resolve));
                inFlight--;
                return { statusCode: 201 };
            });
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.sendToUser('user-1', notification as any);

            expect(send).toHaveBeenCalledTimes(25);
            expect(peak).toBeLessThanOrEqual(10);
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
            endpoint: 'https://fcm.googleapis.com/fcm/send/a',
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
                user: { id: 'user-1' },
                endpoint: 'https://fcm.googleapis.com/fcm/send/a',
                p256dh: 'p256dh-key',
                auth: 'auth-key',
                userAgent: 'Chrome',
            });
        });

        it('keeps only the newest devices of a user', async () => {
            repository.findOne.mockResolvedValue(null);
            repository.findBeyondNewest.mockResolvedValue([
                { id: 'old-1' },
                { id: 'old-2' },
            ]);
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.subscribe('user-1', body);

            expect(repository.findBeyondNewest).toHaveBeenCalledWith(
                'user-1',
                20
            );
            expect(repository.deleteMany).toHaveBeenCalledWith({
                id: { $in: ['old-1', 'old-2'] },
            });
        });

        it('moves a device to whoever signs in on that same browser', async () => {
            const existing = {
                ...subscription(body.endpoint),
                user: { id: 'user-old' },
            };
            repository.findOne.mockResolvedValue(existing);
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.subscribe('user-1', body, 'Chrome');

            expect(repository.create).not.toHaveBeenCalled();
            // A managed reference, never a raw id, on the M:1 relation.
            expect(repository.userReference).toHaveBeenCalledWith('user-1');
            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining({ user: { id: 'user-1' } })
            );
        });

        it('refreshes the keys of the same user device', async () => {
            const existing = {
                ...subscription(body.endpoint),
                auth: 'old-auth',
                user: { id: 'user-1' },
            };
            repository.findOne.mockResolvedValue(existing);
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.subscribe('user-1', body);

            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining({ auth: 'auth-key' })
            );
        });

        it("does not take over another user's device with other keys", async () => {
            repository.findOne.mockResolvedValue({
                ...subscription(body.endpoint),
                auth: 'victim-auth',
                user: { id: 'user-old' },
            });
            const service = new NotificationPushService(
                repository as any,
                config(keys) as any
            );

            await service.subscribe('user-1', body);

            expect(repository.save).not.toHaveBeenCalled();
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
