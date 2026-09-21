import { registerAs } from '@nestjs/config';

export default registerAs(
    'telegram',
    (): Record<string, any> => ({
        webhookSecretToken: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
        apiUrl: process.env.TELEGRAM_API_URL || 'https://api.telegram.org',
    })
);
