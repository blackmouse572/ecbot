import { registerAs } from '@nestjs/config';

export default registerAs(
    'email',
    (): Record<string, any> => ({
        fromEmail: process.env.EMAIL_FROM || 'Ecbot <onboarding@noreply.ecbot.dev>',
        supportEmail: 'support@mail.com',
    })
);
