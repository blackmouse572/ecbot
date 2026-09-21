import { registerAs } from '@nestjs/config';

export default registerAs(
    'turnstile',
    (): Record<string, any> => ({
        // Unset (local dev / tests) disables verification.
        secretKey: process.env.TURNSTILE_SECRET_KEY,
        verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    })
);
