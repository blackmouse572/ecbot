import { registerAs } from '@nestjs/config';

// VAPID keys for browser push. Push stays off unless all three are set.
export default registerAs('webPush', (): Record<string, any> => ({
    publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
    privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
    subject: process.env.WEB_PUSH_VAPID_SUBJECT,
}));
