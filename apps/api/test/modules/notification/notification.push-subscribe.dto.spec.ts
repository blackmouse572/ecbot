import { NotificationPushSubscribeRequestDto } from '@app/modules/notification/dtos/request/notification.push-subscribe.request.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const errorsFor = async (endpoint: string) =>
    validate(
        plainToInstance(NotificationPushSubscribeRequestDto, {
            endpoint,
            keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        })
    );

// The API POSTs to this URL, so only real browser push services pass.
describe('NotificationPushSubscribeRequestDto endpoint', () => {
    it.each([
        'https://fcm.googleapis.com/fcm/send/abc',
        'https://updates.push.services.mozilla.com/wpush/v2/abc',
        'https://wns2-par02p.notify.windows.com/w/?token=abc',
        'https://web.push.apple.com/QGuQyavXutnMbTZ',
    ])('accepts %s', async endpoint => {
        expect(await errorsFor(endpoint)).toHaveLength(0);
    });

    it.each([
        'https://evil.example.com/push',
        'https://fcm.googleapis.com.evil.example.com/x',
        'https://169.254.169.254/latest/meta-data',
        'http://fcm.googleapis.com/fcm/send/abc',
    ])('rejects %s', async endpoint => {
        expect(await errorsFor(endpoint)).not.toHaveLength(0);
    });
});
