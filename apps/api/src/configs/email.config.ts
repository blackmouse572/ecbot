import { registerAs } from '@nestjs/config';

export default registerAs('email', (): Record<string, any> => ({
    fromEmail: process.env.EMAIL_FROM || 'Ecbot <onboarding@noreply.ecbot.dev>',
    // Unset: emails leave the support line out rather than show a
    // placeholder address.
    supportEmail: process.env.EMAIL_SUPPORT || undefined,
}));
